import { useState, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import type { VoiceAnalysisResult } from '../types';

interface VoiceRecorderProps {
    onTranscriptReceived: (transcript: string, confidenceScore: number, analysis?: VoiceAnalysisResult) => void;
    onRecordingStateChange?: (isRecording: boolean) => void;
    disabled?: boolean;
}

export function VoiceRecorder({ onTranscriptReceived, onRecordingStateChange, disabled = false }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [error, setError] = useState<string | null>(null);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);

    const startRecording = async () => {
        try {
            setError(null);
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000
                } 
            });

            // Try WAV first, fall back to webm if not supported
            let mimeType = 'audio/webm';
            let extension = 'webm';
            
            if (MediaRecorder.isTypeSupported('audio/wav')) {
                mimeType = 'audio/wav';
                extension = 'wav';
            }

            const mediaRecorder = new MediaRecorder(stream, { mimeType });

            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                await sendAudioForAnalysis(audioBlob, extension);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            mediaRecorderRef.current = mediaRecorder;
            
            setIsRecording(true);
            onRecordingStateChange?.(true);

            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000) as unknown as number;

        } catch (err: any) {
            console.error('Failed to start recording:', err);
            if (err.name === 'NotAllowedError') {
                setError('Microphone access denied. Please enable microphone permissions.');
            } else if (err.name === 'NotFoundError') {
                setError('No microphone found. Please connect a microphone.');
            } else {
                setError('Failed to start recording. Please try again.');
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            onRecordingStateChange?.(false);
            
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const sendAudioForAnalysis = async (audioBlob: Blob, extension: string) => {
        setIsProcessing(true);
        
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, `recording.${extension}`);

            const response = await fetch('http://localhost:5000/api/interview/analyze-voice', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            const result = await response.json();

            if (result.success) {
                // Pass full analysis including transcript, confidence, and voice metrics
                onTranscriptReceived(
                    result.transcript, 
                    result.confidence_score || result.confidenceScore || 70,
                    result
                );
            } else {
                setError(result.error || 'Failed to analyze audio');
            }

        } catch (err: any) {
            console.error('Failed to analyze audio:', err);
            setError('Failed to process audio. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Recording Button */}
            <div className="flex items-center gap-2">
                {!isRecording && !isProcessing ? (
                    <button
                        onClick={startRecording}
                        disabled={disabled}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                        <Mic className="w-5 h-5" />
                        <span>Start Recording</span>
                    </button>
                ) : isProcessing ? (
                    <button
                        disabled
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-wait"
                    >
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Processing with Whisper...</span>
                    </button>
                ) : (
                    <button
                        onClick={stopRecording}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                        <Square className="w-5 h-5 fill-current" />
                        <span>Stop Recording ({formatTime(recordingTime)})</span>
                    </button>
                )}
            </div>

            {/* Recording Indicator */}
            {isRecording && (
                <div className="flex items-center gap-2 text-sm text-red-400">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span>Recording... Speak clearly</span>
                </div>
            )}

            {/* Processing Indicator */}
            {isProcessing && (
                <div className="text-sm text-blue-400">
                    ⏳ Processing audio with Whisper (may take 10-20 seconds on first use)...
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="text-sm text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                    {error}
                </div>
            )}
        </div>
    );
}
