import { useState, useRef } from 'react';
import { Mic, Square } from 'lucide-react';

interface LocalVoiceRecorderProps {
    onTranscriptReceived: (transcript: string) => void;
    disabled?: boolean;
}

export function LocalVoiceRecorder({ onTranscriptReceived, disabled = false }: LocalVoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [liveTranscript, setLiveTranscript] = useState('');
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recognitionRef = useRef<any>(null);
    const timerRef = useRef<number | null>(null);

    const startRecording = async () => {
        try {
            setError(null);
            setLiveTranscript('');
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000
                } 
            });

            // Start audio recording (just for visual feedback)
            const mimeType = 'audio/webm';
            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;
            
            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            // Start timer
            timerRef.current = window.setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

            // Use Web Speech API for live transcription (no backend needed)
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'en-US';

                recognition.onresult = (event: any) => {
                    let finalTranscript = '';
                    let interimTranscript = '';

                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const transcript = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            finalTranscript += transcript + ' ';
                        } else {
                            interimTranscript += transcript;
                        }
                    }

                    setLiveTranscript(prev => prev + finalTranscript + interimTranscript);
                };

                recognition.onerror = (event: any) => {
                    console.error('Speech recognition error:', event.error);
                };

                recognition.start();
                recognitionRef.current = recognition;
            } else {
                setError('Browser does not support speech recognition');
            }

        } catch (err: any) {
            console.error('Failed to start recording:', err);
            setError('Failed to access microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        // Stop media recorder
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }

        // Stop speech recognition
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }

        // Stop timer
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        setIsRecording(false);
        
        // Send final transcript
        if (liveTranscript.trim()) {
            onTranscriptReceived(liveTranscript.trim());
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
                {!isRecording ? (
                    <button
                        onClick={startRecording}
                        disabled={disabled}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
                    >
                        <Mic className="w-5 h-5" />
                        Start Recording
                    </button>
                ) : (
                    <button
                        onClick={stopRecording}
                        className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 rounded-lg text-white font-medium transition-colors animate-pulse"
                    >
                        <Square className="w-5 h-5" />
                        Stop Recording
                    </button>
                )}

                {isRecording && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-red-400 font-mono text-sm">{formatTime(recordingTime)}</span>
                    </div>
                )}
            </div>

            {/* Live Transcript */}
            {isRecording && liveTranscript && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="text-xs text-blue-400 mb-2">Live Transcript:</div>
                    <div className="text-sm text-white">{liveTranscript}</div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
                    {error}
                </div>
            )}

            <div className="text-xs text-slate-500">
                Local browser-based speech recognition - No API calls, no backend processing
            </div>
        </div>
    );
}
