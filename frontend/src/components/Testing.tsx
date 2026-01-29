import { useState } from 'react';
import { VoiceRecorder } from './VoiceRecorder';
import { Mic, Activity, MessageSquare, Gauge, Volume2 } from 'lucide-react';
import type { VoiceAnalysisResult } from '../types';

export function Testing() {
    const [transcript, setTranscript] = useState('');
    const [confidence, setConfidence] = useState<number | null>(null);
    const [analysis, setAnalysis] = useState<VoiceAnalysisResult | null>(null);

    const handleTranscriptReceived = (text: string, conf: number, analysisData?: VoiceAnalysisResult) => {
        setTranscript(text);
        setConfidence(conf);
        setAnalysis(analysisData || null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            <div className="max-w-4xl mx-auto p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Voice Recorder Test (Whisper)</h1>
                    <p className="text-slate-400">Test voice recording with Whisper transcription - Record, then wait for processing</p>
                </div>

                {/* Voice Recorder */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Mic className="w-5 h-5 text-emerald-400" />
                        <h2 className="text-xl font-semibold text-white">Voice Analysis Testing</h2>
                    </div>
                    
                    <VoiceRecorder
                        onTranscriptReceived={handleTranscriptReceived}
                    />
                </div>

                {/* Final Transcript */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 mb-6">
                    <h3 className="text-sm font-medium text-slate-400 mb-3">Transcript (faster-whisper)</h3>
                    <textarea
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        placeholder="Click 'Start Recording' and speak. Wait 2-5 seconds for processing..."
                        className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    
                    {confidence !== null && (
                        <div className="mt-4 text-sm">
                            <span className="text-slate-400">Delivery Confidence:</span>{' '}
                            <span className={`font-semibold ${confidence >= 70 ? 'text-emerald-400' : confidence >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {confidence}/100
                            </span>
                            <span className="text-xs text-slate-500 ml-2">(Based on tone, pace, clarity)</span>
                        </div>
                    )}
                </div>

                {/* Voice Analysis Breakdown */}
                {analysis?.analysis && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {/* Filler Words */}
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <MessageSquare className="w-5 h-5 text-blue-400" />
                                <h3 className="text-lg font-semibold text-white">Speech Clarity</h3>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">Filler Words</span>
                                    <span className={`font-semibold ${analysis.analysis.filler_words.percentage < 5 ? 'text-emerald-400' : analysis.analysis.filler_words.percentage < 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {analysis.analysis.filler_words.count} ({analysis.analysis.filler_words.percentage.toFixed(1)}%)
                                    </span>
                                </div>
                                {Object.keys(analysis.analysis.filler_words.found).length > 0 && (
                                    <div className="text-xs text-slate-500">
                                        Most common: {Object.entries(analysis.analysis.filler_words.found)
                                            .sort((a, b) => b[1] - a[1])
                                            .slice(0, 3)
                                            .map(([word, count]) => `${word} (${count})`)
                                            .join(', ')}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Speech Pace */}
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Gauge className="w-5 h-5 text-purple-400" />
                                <h3 className="text-lg font-semibold text-white">Speech Pace</h3>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">Words/Minute</span>
                                    <span className="font-semibold text-white">
                                        {analysis.analysis.speech_pace.words_per_minute.toFixed(0)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">Rating</span>
                                    <span className={`font-semibold capitalize ${
                                        analysis.analysis.speech_pace.pace_rating === 'normal' ? 'text-emerald-400' :
                                        analysis.analysis.speech_pace.pace_rating === 'fast' ? 'text-yellow-400' :
                                        'text-orange-400'
                                    }`}>
                                        {analysis.analysis.speech_pace.pace_rating.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Sentiment Analysis */}
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Activity className="w-5 h-5 text-emerald-400" />
                                <h3 className="text-lg font-semibold text-white">Tone & Confidence</h3>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">Positive</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-emerald-400" 
                                                style={{ width: `${analysis.analysis.sentiment.positive * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-slate-400 w-10 text-right">
                                            {(analysis.analysis.sentiment.positive * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">Neutral</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-blue-400" 
                                                style={{ width: `${analysis.analysis.sentiment.neutral * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-slate-400 w-10 text-right">
                                            {(analysis.analysis.sentiment.neutral * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">Compound Score</span>
                                    <span className={`font-semibold ${
                                        analysis.analysis.sentiment.compound > 0.3 ? 'text-emerald-400' :
                                        analysis.analysis.sentiment.compound > 0 ? 'text-blue-400' :
                                        analysis.analysis.sentiment.compound > -0.3 ? 'text-yellow-400' :
                                        'text-red-400'
                                    }`}>
                                        {analysis.analysis.sentiment.compound.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Voice Quality */}
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Volume2 className="w-5 h-5 text-orange-400" />
                                <h3 className="text-lg font-semibold text-white">Voice Quality</h3>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">Pitch Variation</span>
                                    <span className="font-semibold text-white">
                                        {analysis.analysis.voice_quality.pitch_variation.toFixed(1)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">Energy Level</span>
                                    <span className={`font-semibold ${
                                        analysis.analysis.voice_quality.energy_level > 5 ? 'text-emerald-400' :
                                        analysis.analysis.voice_quality.energy_level > 3 ? 'text-yellow-400' :
                                        'text-orange-400'
                                    }`}>
                                        {analysis.analysis.voice_quality.energy_level.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">Clarity Score</span>
                                    <span className="font-semibold text-white">
                                        {analysis.analysis.voice_quality.clarity_score.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Info */}
                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-sm text-blue-300 mb-2">
                        <strong>Testing Mode:</strong> Full voice analysis locally (faster-whisper + sentiment)
                    </p>
                    <p className="text-xs text-blue-400 mb-2">
                        ✓ Transcription (faster-whisper)<br />
                        ✓ Filler words detection<br />
                        ✓ Speech pace analysis<br />
                        ✓ Sentiment & tone analysis<br />
                        ✓ Voice quality metrics<br />
                        ✗ No Gemini API calls (saves rate limits)
                    </p>
                    <p className="text-xs text-slate-400 mt-3">
                        <strong>Interview Mode:</strong> Same voice analysis + Gemini evaluates answer content (technical accuracy, clarity, depth)
                    </p>
                </div>
            </div>
        </div>
    );
}
