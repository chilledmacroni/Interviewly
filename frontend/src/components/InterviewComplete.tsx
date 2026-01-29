import { type InterviewSummary } from '../types';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { saveInterviewResult } from '../services/api';
import { useEffect, useState } from 'react';

interface InterviewCompleteProps {
    summary: InterviewSummary;
    onRestart: () => void;
    skipAutoSave?: boolean; // NEW: Skip auto-save if already saved
}

export function InterviewComplete({ summary, onRestart, skipAutoSave = false }: InterviewCompleteProps) {
    const { user } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(skipAutoSave ? 'saved' : 'idle');
    
    // Auto-save results when component mounts (only for logged-in users and if not already saved)
    useEffect(() => {
        if (skipAutoSave) return; // Skip if already saved via Save & Exit
        
        const saveResults = async () => {
            if (!user || saveStatus !== 'idle') return;
            
            setIsSaving(true);
            setSaveStatus('saving');
            
            try {
                await saveInterviewResult(summary);
                setSaveStatus('saved');
            } catch (error) {
                console.error('Failed to save interview results:', error);
                setSaveStatus('error');
            } finally {
                setIsSaving(false);
            }
        };

        saveResults();
    }, [user, summary, saveStatus, skipAutoSave]);
    
    const getGradeEmoji = (score: number) => {
        if (score >= 9) return '🏆';
        if (score >= 7) return '🌟';
        if (score >= 5) return '👍';
        if (score >= 3) return '📚';
        return '💪';
    };

    const getGradeText = (score: number) => {
        if (score >= 9) return 'Outstanding!';
        if (score >= 7) return 'Great Job!';
        if (score >= 5) return 'Good Effort';
        if (score >= 3) return 'Keep Practicing';
        return 'Room to Grow';
    };

    // Use summary data
    const topStrengths = summary.topStrengths || [];
    const keyWeaknesses = summary.keyWeaknesses || [];

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 flex items-center justify-center p-6">
            <div className="max-w-5xl w-full space-y-6 animate-fade-in">
                
                {/* Save Status Banner (only for logged-in users) */}
                {user && saveStatus === 'saved' && (
                    <div className="bg-emerald-900/30 border border-emerald-600/50 rounded-xl p-4 flex items-center gap-3">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-emerald-300 text-sm">Interview results saved successfully!</span>
                    </div>
                )}
                
                {user && saveStatus === 'error' && (
                    <div className="bg-red-900/30 border border-red-600/50 rounded-xl p-4 flex items-center gap-3">
                        <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-red-300 text-sm">Failed to save results. You can still view your summary.</span>
                    </div>
                )}
                
                {/* Main Score Card with Animation */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center transform transition-all duration-700 hover:scale-[1.02]">
                    <div className="text-7xl mb-4 animate-bounce-slow">{getGradeEmoji(summary.overallScore)}</div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent mb-2">
                        Interview Complete!
                    </h1>
                    <p className="text-2xl text-slate-400 mb-8">
                        {getGradeText(summary.overallScore)}
                    </p>

                    {/* Score Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                            <p className="text-xs text-slate-500 mb-1">Overall Score</p>
                            <p className="text-3xl font-bold text-emerald-400">
                                {summary.overallScore.toFixed(1)}<span className="text-lg text-slate-500">/10</span>
                            </p>
                        </div>
                        <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                            <p className="text-xs text-slate-500 mb-1">Avg Confidence</p>
                            <p className="text-3xl font-bold text-blue-400">
                                {summary.averageConfidence?.toFixed(1) || '0.0'}<span className="text-lg text-slate-500">/10</span>
                            </p>
                        </div>
                        <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                            <p className="text-xs text-slate-500 mb-1">Technical</p>
                            <p className="text-3xl font-bold text-purple-400">
                                {summary.technicalAverage?.toFixed(1) || '0.0'}<span className="text-lg text-slate-500">/10</span>
                            </p>
                        </div>
                        <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                            <p className="text-xs text-slate-500 mb-1">Behavioral</p>
                            <p className="text-3xl font-bold text-yellow-400">
                                {summary.behavioralAverage?.toFixed(1) || '0.0'}<span className="text-lg text-slate-500">/10</span>
                            </p>
                        </div>
                    </div>
                    
                    {/* Voice Delivery Metrics (if voice was used) */}
                    {summary.voiceAnswersCount && summary.voiceAnswersCount > 0 && (
                        <div className="bg-purple-950/20 border border-purple-800/30 rounded-xl p-6 mb-6">
                            <div className="flex items-center gap-2 mb-4">
                                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                                <h3 className="text-lg font-semibold text-purple-300">
                                    Voice Delivery Analysis <span className="text-sm text-slate-500">({summary.voiceAnswersCount} voice answers)</span>
                                </h3>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {summary.averageVoiceConfidence !== undefined && (
                                    <div className="bg-slate-900/50 rounded-lg p-3">
                                        <p className="text-xs text-slate-400 mb-1">Delivery Confidence</p>
                                        <p className="text-2xl font-bold text-purple-300">
                                            {summary.averageVoiceConfidence.toFixed(0)}<span className="text-sm text-slate-500">/100</span>
                                        </p>
                                    </div>
                                )}
                                
                                {summary.averageFillerPercentage !== undefined && (
                                    <div className="bg-slate-900/50 rounded-lg p-3">
                                        <p className="text-xs text-slate-400 mb-1">Filler Words</p>
                                        <p className={`text-2xl font-bold ${
                                            summary.averageFillerPercentage > 10 ? 'text-red-400' :
                                            summary.averageFillerPercentage > 5 ? 'text-yellow-400' :
                                            'text-green-400'
                                        }`}>
                                            {summary.averageFillerPercentage.toFixed(1)}<span className="text-sm text-slate-500">%</span>
                                        </p>
                                    </div>
                                )}
                                
                                {summary.averageSpeechPace !== undefined && (
                                    <div className="bg-slate-900/50 rounded-lg p-3">
                                        <p className="text-xs text-slate-400 mb-1">Speech Pace</p>
                                        <p className="text-2xl font-bold text-blue-300">
                                            {summary.averageSpeechPace.toFixed(0)}<span className="text-sm text-slate-500"> WPM</span>
                                        </p>
                                    </div>
                                )}
                                
                                {summary.averageToneScore !== undefined && (
                                    <div className="bg-slate-900/50 rounded-lg p-3">
                                        <p className="text-xs text-slate-400 mb-1">Tone Score</p>
                                        <p className={`text-2xl font-bold ${
                                            summary.averageToneScore > 0.3 ? 'text-green-400' :
                                            summary.averageToneScore < -0.3 ? 'text-red-400' :
                                            'text-yellow-400'
                                        }`}>
                                            {summary.averageToneScore > 0 ? '+' : ''}{summary.averageToneScore.toFixed(2)}
                                        </p>
                                    </div>
                                )}
                                
                                {summary.averageVocalEnergy !== undefined && (
                                    <div className="bg-slate-900/50 rounded-lg p-3">
                                        <p className="text-xs text-slate-400 mb-1">Vocal Energy</p>
                                        <p className={`text-2xl font-bold ${
                                            summary.averageVocalEnergy > 6 ? 'text-green-400' :
                                            summary.averageVocalEnergy < 4 ? 'text-red-400' :
                                            'text-yellow-400'
                                        }`}>
                                            {summary.averageVocalEnergy.toFixed(1)}<span className="text-sm text-slate-500">/10</span>
                                        </p>
                                    </div>
                                )}
                            </div>
                            
                            <p className="text-xs text-purple-300 mt-4">
                                Voice delivery metrics directly impacted your final scores (30% weight)
                            </p>
                        </div>
                    )}

                    {summary.overallFeedback && (
                        <p className="text-slate-300 leading-relaxed max-w-2xl mx-auto text-lg">
                            {summary.overallFeedback}
                        </p>
                    )}
                </div>

                {/* Two Column Layout for Strengths and Tips */}
                <div className="grid md:grid-cols-2 gap-6">
                    
                    {/* Top Strengths */}
                    {topStrengths.length > 0 && (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 transform transition-all duration-500 delay-100">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-2xl">💪</span>
                                <h2 className="text-xl font-semibold text-white">Top Strengths</h2>
                            </div>
                            <div className="space-y-3">
                                {topStrengths.slice(0, 5).map((strength, idx) => (
                                    <div 
                                        key={idx} 
                                        className="bg-emerald-950/20 rounded-lg p-3 text-sm text-emerald-200 flex items-start gap-3 border border-emerald-800/30"
                                    >
                                        <svg className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>{strength}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actionable Tips */}
                    {keyWeaknesses.length > 0 && (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 transform transition-all duration-500 delay-200">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-2xl">💡</span>
                                <h2 className="text-xl font-semibold text-white">Actionable Tips</h2>
                            </div>
                            <div className="space-y-3">
                                {keyWeaknesses.slice(0, 5).map((tip, idx) => (
                                    <div 
                                        key={idx} 
                                        className="bg-slate-950/50 rounded-lg p-3 text-sm text-slate-300 flex items-start gap-3 border border-slate-800/50"
                                    >
                                        <svg className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>{tip}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Question Breakdown */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 transform transition-all duration-500 delay-300">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
                        <span className="text-2xl">📊</span>
                        Question Breakdown
                    </h2>

                    <div className="space-y-4">
                        {summary.questionScores.map((qs, index) => (
                            <div
                                key={index}
                                className="bg-slate-950/50 rounded-xl p-4 border border-slate-800 hover:border-slate-700 transition-colors"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0">
                                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold ${
                                            qs.score >= 8 ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/50' :
                                            qs.score >= 5 ? 'bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/50' :
                                            'bg-red-500/20 text-red-400 border-2 border-red-500/50'
                                        }`}>
                                            {qs.score}
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <p className="font-semibold text-white">
                                                Q{qs.questionNumber}
                                            </p>
                                            {qs.confidenceScore !== undefined && (
                                                <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
                                                    Confidence: {qs.confidenceScore}/10
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-400 mb-2">
                                            {qs.question.slice(0, 150)}{qs.question.length > 150 ? '...' : ''}
                                        </p>
                                        <p className="text-sm text-slate-300">
                                            {qs.feedback}
                                        </p>
                                        
                                        {/* Show insights for this question */}
                                        {qs.insights && qs.insights.length > 0 && (
                                            <div className="mt-3 space-y-1">
                                                {qs.insights.map((insight, i) => (
                                                    <div key={i} className="flex items-start gap-2 text-xs text-blue-300">
                                                        <svg className="w-3 h-3 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                        </svg>
                                                        <span>{insight}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-center gap-4 transform transition-all duration-500 delay-500">
                    {user ? (
                        <>
                            <Link
                                to="/dashboard"
                                className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold flex items-center gap-2 transition-all"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                View Dashboard
                            </Link>
                            <button
                                onClick={onRestart}
                                className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold flex items-center gap-2 transition-all"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                New Interview
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                to="/"
                                className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold flex items-center gap-2 transition-all"
                            >
                                Back to Home
                            </Link>
                            <Link
                                to="/register"
                                className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold flex items-center gap-2 transition-all"
                            >
                                Sign Up to Save
                            </Link>
                        </>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fade-in {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes bounce-slow {
                    0%, 100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-10px);
                    }
                }

                .animate-fade-in {
                    animation: fade-in 0.6s ease-out;
                }

                .animate-bounce-slow {
                    animation: bounce-slow 2s infinite;
                }
            `}</style>
        </div>
    );
}
