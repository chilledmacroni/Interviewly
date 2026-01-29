import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDashboardSummary, getInterviewResults, getInterviewStats, speakText } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { playAudioFromBase64, stopAudio } from '../utils/audioUtils';

interface DashboardSummary {
    averageScore: number;
    totalInterviews: number;
    strongPoints: string;
    recentSessions: SessionHistoryItem[];
}

interface SessionHistoryItem {
    id: string;
    date: string;
    techStack: string;
    score: number;
    difficulty: string;
    questionsAnswered: number;
}

interface InterviewResult {
    id: string;
    completedAt: string;
    overallScore: number;
    averageConfidence: number;
    technicalAverage: number;
    behavioralAverage: number;
    questionsAnswered: number;
    topStrengths: string[];
    keyWeaknesses: string[];
    isComplete?: boolean; // Added to track incomplete interviews
}

interface InterviewStats {
    totalInterviews: number;
    averageScore: number;
    averageConfidence: number;
    highestScore: number;
    lowestScore: number;
    recentTrend: string;
}

export const Dashboard: React.FC = () => {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [results, setResults] = useState<InterviewResult[]>([]);
    const [stats, setStats] = useState<InterviewStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [audioInstance, setAudioInstance] = useState<HTMLAudioElement | null>(null);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            setIsLoading(true);
            const [dashData, resultsData, statsData] = await Promise.all([
                getDashboardSummary().catch(() => null),
                getInterviewResults().catch(() => []),
                getInterviewStats().catch(() => null),
            ]);
            setSummary(dashData);
            setResults(resultsData);
            setStats(statsData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        } finally {
            setIsLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 8) return 'text-emerald-400';
        if (score >= 6) return 'text-yellow-400';
        return 'text-rose-400';
    };

    const getScoreGradient = (score: number) => {
        if (score >= 8) return 'from-emerald-500 to-teal-400';
        if (score >= 6) return 'from-yellow-500 to-amber-400';
        return 'from-rose-500 to-pink-400';
    };

    const handleTestTTS = async () => {
        try {
            // If already speaking, stop
            if (isSpeaking) {
                stopAudio(audioInstance);
                setAudioInstance(null);
                setIsSpeaking(false);
                return;
            }

            const testText = `Welcome to your Interviewly dashboard! You have completed ${stats?.totalInterviews || 0} interviews with an average score of ${stats?.averageScore?.toFixed(1) || 0} out of 10. Keep up the great work!`;

            setIsGeneratingAudio(true);
            const result = await speakText(testText);
            setIsGeneratingAudio(false);

            if (!result.success || !result.audioBase64) {
                console.error('[TTS] Failed:', result.error);
                alert('TTS Error: ' + (result.error || 'Unknown error'));
                return;
            }

            const audio = playAudioFromBase64(
                result.audioBase64,
                () => {
                    setIsSpeaking(false);
                    setAudioInstance(null);
                },
                (error) => {
                    console.error('[TTS] Playback error:', error);
                    setIsSpeaking(false);
                    setAudioInstance(null);
                }
            );

            setAudioInstance(audio);
            setIsSpeaking(true);
        } catch (error) {
            console.error('[TTS] Error:', error);
            setIsGeneratingAudio(false);
            setIsSpeaking(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <div className="text-center">
                    <svg className="animate-spin h-12 w-12 text-emerald-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-slate-400">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-rose-400 mb-4">{error}</p>
                    <button onClick={loadDashboard} className="btn-neon">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020617] text-slate-300">
            {/* Navbar */}
            <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto border-b border-slate-800">
                <Link to="/" className="flex items-center space-x-2 text-white font-bold text-xl tracking-tight">
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-black">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M12.378 1.602a.75.75 0 00-.756 0L3 6.632l9 5.25 9-5.25-8.622-5.03zM21.75 7.93l-9 5.25v9l8.628-5.032a.75.75 0 00.372-.648V7.93zM11.25 22.18v-9l-9-5.25v8.57a.75.75 0 00.372.648l8.628 5.033z" />
                        </svg>
                    </div>
                    <span>Interviewly</span>
                </Link>

                <div className="flex items-center gap-6">
                    <Link to="/" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">New Interview</Link>
                    <div className="h-4 w-px bg-slate-800"></div>
                    <span className="text-slate-400 text-sm">Hi, {user?.firstName}</span>
                    <button onClick={logout} className="text-rose-400 hover:text-rose-300 text-sm font-medium">Logout</button>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-12">
                {/* Header */}
                <div className="mb-12 flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">Your Dashboard</h1>
                        <p className="text-slate-400">Track your progress and improve your interview skills</p>
                    </div>
                    
                    {/* TTS Test Button */}
                    <button
                        onClick={handleTestTTS}
                        disabled={isGeneratingAudio}
                        className={`p-3 rounded-lg transition-all ${
                            isSpeaking 
                                ? 'bg-emerald-500/20 text-emerald-400' 
                                : 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-emerald-400'
                        } ${isGeneratingAudio ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                        title={isSpeaking ? 'Stop speaking' : 'Test TTS - Read dashboard stats'}
                    >
                        {isGeneratingAudio ? (
                            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : isSpeaking ? (
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Stats Grid - Primary Metrics from MongoDB */}
                <div className="grid md:grid-cols-4 gap-6 mb-12">
                    {/* Average Score Card - Across ALL Interviews */}
                    <div className="stealth-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Avg Score</h3>
                            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                        </div>
                        <div className={`text-5xl font-bold mb-4 ${getScoreColor(stats?.averageScore || summary?.averageScore || 0)}`}>
                            {(stats?.averageScore || summary?.averageScore || 0).toFixed(1)}
                            <span className="text-2xl text-slate-500">/10</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                                className={`h-full bg-gradient-to-r ${getScoreGradient(stats?.averageScore || summary?.averageScore || 0)} transition-all duration-1000 ease-out`}
                                style={{ width: `${(stats?.averageScore || summary?.averageScore || 0) * 10}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Across all interviews</p>
                    </div>

                    {/* Average Confidence Card - Across ALL Interviews */}
                    <div className="stealth-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Avg Confidence</h3>
                            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                        </div>
                        <div className="text-5xl font-bold mb-4 text-blue-400">
                            {(stats?.averageConfidence || 0).toFixed(1)}
                            <span className="text-2xl text-slate-500">/10</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-1000 ease-out"
                                style={{ width: `${(stats?.averageConfidence || 0) * 10}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Across all interviews</p>
                    </div>

                    {/* Total Interviews Card */}
                    <div className="stealth-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Interviews</h3>
                            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                            </div>
                        </div>
                        <div className="text-5xl font-bold text-white mb-4">
                            {stats?.totalInterviews || summary?.totalInterviews || 0}
                        </div>
                        <p className="text-sm text-slate-400">Completed sessions</p>
                    </div>

                    {/* Performance Trend */}
                    <div className="stealth-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Trend</h3>
                            <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                        </div>
                        <div className={`text-3xl font-bold mb-2 ${
                            stats?.recentTrend === 'Improving' ? 'text-emerald-400' :
                            stats?.recentTrend === 'Declining' ? 'text-rose-400' :
                            'text-slate-400'
                        }`}>
                            {stats?.recentTrend === 'Improving' && '📈'}
                            {stats?.recentTrend === 'Declining' && '📉'}
                            {stats?.recentTrend === 'Stable' && '➡️'}
                            {(!stats || stats.totalInterviews === 0) && '📊'}
                        </div>
                        <p className="text-sm text-slate-300">
                            {stats?.recentTrend || (summary?.strongPoints ? 'Getting Started' : 'No data yet')}
                        </p>
                    </div>
                </div>

                {/* Voice Delivery Metrics (if voice was used in any interview) */}
                {stats && stats.totalVoiceAnswers && stats.totalVoiceAnswers > 0 && (
                    <div className="bg-purple-950/20 border border-purple-800/30 rounded-xl p-6 mb-12">
                        <div className="flex items-center gap-2 mb-6">
                            <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                            <h3 className="text-xl font-semibold text-purple-300">
                                Voice Delivery Performance <span className="text-sm text-slate-500">({stats.totalVoiceAnswers} voice answers total)</span>
                            </h3>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {stats.averageVoiceConfidence !== undefined && stats.averageVoiceConfidence !== null && (
                                <div className="bg-slate-900/50 rounded-lg p-4">
                                    <p className="text-xs text-slate-400 mb-2">Avg Delivery Confidence</p>
                                    <p className="text-3xl font-bold text-purple-300">
                                        {stats.averageVoiceConfidence.toFixed(0)}<span className="text-sm text-slate-500">/100</span>
                                    </p>
                                    <div className="w-full bg-slate-700 rounded-full h-1.5 mt-2">
                                        <div 
                                            className={`h-1.5 rounded-full ${
                                                stats.averageVoiceConfidence >= 70 ? 'bg-green-500' :
                                                stats.averageVoiceConfidence >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`}
                                            style={{ width: `${stats.averageVoiceConfidence}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                            
                            {stats.averageFillerPercentage !== undefined && stats.averageFillerPercentage !== null && (
                                <div className="bg-slate-900/50 rounded-lg p-4">
                                    <p className="text-xs text-slate-400 mb-2">Avg Filler Words</p>
                                    <p className={`text-3xl font-bold ${
                                        stats.averageFillerPercentage > 10 ? 'text-red-400' :
                                        stats.averageFillerPercentage > 5 ? 'text-yellow-400' :
                                        'text-green-400'
                                    }`}>
                                        {stats.averageFillerPercentage.toFixed(1)}<span className="text-sm text-slate-500">%</span>
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {stats.averageFillerPercentage > 10 ? 'Needs work' :
                                         stats.averageFillerPercentage > 5 ? 'Good' : 'Excellent'}
                                    </p>
                                </div>
                            )}
                            
                            {stats.averageSpeechPace !== undefined && stats.averageSpeechPace !== null && (
                                <div className="bg-slate-900/50 rounded-lg p-4">
                                    <p className="text-xs text-slate-400 mb-2">Avg Speech Pace</p>
                                    <p className="text-3xl font-bold text-blue-300">
                                        {stats.averageSpeechPace.toFixed(0)}<span className="text-sm text-slate-500"> WPM</span>
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {stats.averageSpeechPace < 100 ? 'Too slow' :
                                         stats.averageSpeechPace > 200 ? 'Too fast' : 'Optimal'}
                                    </p>
                                </div>
                            )}
                            
                            {stats.averageToneScore !== undefined && stats.averageToneScore !== null && (
                                <div className="bg-slate-900/50 rounded-lg p-4">
                                    <p className="text-xs text-slate-400 mb-2">Avg Tone Score</p>
                                    <p className={`text-3xl font-bold ${
                                        stats.averageToneScore > 0.3 ? 'text-green-400' :
                                        stats.averageToneScore < -0.3 ? 'text-red-400' :
                                        'text-yellow-400'
                                    }`}>
                                        {stats.averageToneScore > 0 ? '+' : ''}{stats.averageToneScore.toFixed(2)}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {stats.averageToneScore > 0.3 ? 'Confident' :
                                         stats.averageToneScore < -0.3 ? 'Hesitant' : 'Neutral'}
                                    </p>
                                </div>
                            )}
                            
                            {stats.averageVocalEnergy !== undefined && stats.averageVocalEnergy !== null && (
                                <div className="bg-slate-900/50 rounded-lg p-4">
                                    <p className="text-xs text-slate-400 mb-2">Avg Vocal Energy</p>
                                    <p className={`text-3xl font-bold ${
                                        stats.averageVocalEnergy > 6 ? 'text-green-400' :
                                        stats.averageVocalEnergy < 4 ? 'text-red-400' :
                                        'text-yellow-400'
                                    }`}>
                                        {stats.averageVocalEnergy.toFixed(1)}<span className="text-sm text-slate-500">/10</span>
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {stats.averageVocalEnergy > 6 ? 'Strong' :
                                         stats.averageVocalEnergy < 4 ? 'Low' : 'Moderate'}
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        <p className="text-xs text-purple-300 mt-4">
                            Voice delivery metrics from all your voice answers across interviews. These directly impact final scores (30% weight).
                        </p>
                    </div>
                )}

                {/* Detailed Stats Breakdown (from MongoDB) */}
                {stats && stats.totalInterviews > 0 && (
                    <div className="grid md:grid-cols-2 gap-6 mb-12">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <span>🎯</span>
                                Performance Range
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-400">Highest Score</span>
                                    <span className="text-lg font-bold text-emerald-400">
                                        {stats.highestScore.toFixed(1)}/10
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-400">Lowest Score</span>
                                    <span className="text-lg font-bold text-yellow-400">
                                        {stats.lowestScore.toFixed(1)}/10
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-400">Improvement Gap</span>
                                    <span className="text-lg font-bold text-blue-400">
                                        {(stats.highestScore - stats.lowestScore).toFixed(1)} pts
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <span>💪</span>
                                Strengths Summary
                            </h3>
                            <p className="text-sm text-slate-300 leading-relaxed">
                                {summary?.strongPoints || 'Complete more interviews to see aggregated strengths and personalized insights!'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Interview History from MongoDB */}
                {results.length > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-12">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                            <span>📊</span>
                            Your Interview History
                        </h2>
                        <div className="space-y-4">
                            {results.map((result) => (
                                <div
                                    key={result.id}
                                    className="bg-slate-950/50 rounded-xl p-5 border border-slate-800 hover:border-slate-700 transition-all hover:shadow-lg relative"
                                >
                                    {/* Incomplete badge */}
                                    {result.isComplete === false && (
                                        <div className="absolute top-3 right-3">
                                            <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-semibold rounded-full border border-yellow-500/50">
                                                In Progress
                                            </span>
                                        </div>
                                    )}
                                    
                                    <div className="flex items-start justify-between gap-6">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold ${
                                                    result.overallScore >= 8 ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/50' :
                                                    result.overallScore >= 5 ? 'bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/50' :
                                                    'bg-red-500/20 text-red-400 border-2 border-red-500/50'
                                                }`}>
                                                    {result.overallScore.toFixed(1)}
                                                </div>
                                                <div>
                                                    <p className="text-lg font-semibold text-white">
                                                        {new Date(result.completedAt).toLocaleDateString('en-US', {
                                                            weekday: 'short',
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </p>
                                                    <p className="text-sm text-slate-400">
                                                        {result.questionsAnswered} questions answered
                                                        {result.isComplete === false && <span className="text-yellow-400 ml-1">(saved mid-interview)</span>}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            {/* Metrics Grid */}
                                            <div className="grid grid-cols-3 gap-3 mb-3">
                                                <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-800">
                                                    <p className="text-xs text-slate-500">Confidence</p>
                                                    <p className="text-sm font-bold text-blue-400">{result.averageConfidence.toFixed(1)}/10</p>
                                                </div>
                                                <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-800">
                                                    <p className="text-xs text-slate-500">Technical</p>
                                                    <p className="text-sm font-bold text-purple-400">{result.technicalAverage.toFixed(1)}/10</p>
                                                </div>
                                                <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-800">
                                                    <p className="text-xs text-slate-500">Behavioral</p>
                                                    <p className="text-sm font-bold text-yellow-400">{result.behavioralAverage.toFixed(1)}/10</p>
                                                </div>
                                            </div>

                                            {/* Top Strengths Preview */}
                                            {result.topStrengths.length > 0 && (
                                                <div className="mb-2">
                                                    <p className="text-xs text-emerald-400 font-semibold mb-1">💪 Strengths:</p>
                                                    <p className="text-xs text-slate-300">
                                                        {result.topStrengths.slice(0, 2).join(' • ')}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Weaknesses Preview */}
                                            {result.keyWeaknesses.length > 0 && (
                                                <div>
                                                    <p className="text-xs text-yellow-400 font-semibold mb-1">💡 Areas to improve:</p>
                                                    <p className="text-xs text-slate-300">
                                                        {result.keyWeaknesses.slice(0, 2).join(' • ')}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Session History */}
                <div className="stealth-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white">Recent Sessions</h2>
                        <Link to="/" className="btn-neon text-sm py-2 px-4">
                            New Interview
                        </Link>
                    </div>

                    {summary?.recentSessions && summary.recentSessions.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-800">
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">Tech Stack</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">Difficulty</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">Questions</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">Score</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summary.recentSessions.map((session) => (
                                        <tr key={session.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                            <td className="py-4 px-4 text-sm text-slate-300">
                                                {new Date(session.date).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </td>
                                            <td className="py-4 px-4 text-sm text-white font-medium">{session.techStack}</td>
                                            <td className="py-4 px-4">
                                                <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${session.difficulty === 'hard' ? 'bg-rose-500/20 text-rose-400' :
                                                        session.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                                            'bg-emerald-500/20 text-emerald-400'
                                                    }`}>
                                                    {session.difficulty}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-sm text-slate-300">{session.questionsAnswered}</td>
                                            <td className="py-4 px-4">
                                                <span className={`text-lg font-bold ${getScoreColor(session.score)}`}>
                                                    {session.score.toFixed(1)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <button
                                                    onClick={() => navigate(`/session/${session.id}`)}
                                                    className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
                                                >
                                                    View Details →
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                            </div>
                            <p className="text-slate-400 mb-4">No interviews yet</p>
                            <Link to="/" className="btn-neon inline-flex items-center">
                                Start Your First Interview
                                <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </Link>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
