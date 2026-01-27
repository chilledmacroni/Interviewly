import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDashboardSummary } from '../services/api';
import { useAuth } from '../context/AuthContext';

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

export const Dashboard: React.FC = () => {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            setIsLoading(true);
            const data = await getDashboardSummary();
            setSummary(data);
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
                <div className="mb-12">
                    <h1 className="text-4xl font-bold text-white mb-2">Your Dashboard</h1>
                    <p className="text-slate-400">Track your progress and improve your interview skills</p>
                </div>

                {/* Stats Grid */}
                <div className="grid md:grid-cols-3 gap-6 mb-12">
                    {/* Average Score Card */}
                    <div className="stealth-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Average Score</h3>
                            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                        </div>
                        <div className={`text-5xl font-bold mb-4 ${getScoreColor(summary?.averageScore || 0)}`}>
                            {summary?.averageScore.toFixed(1) || '0.0'}
                            <span className="text-2xl text-slate-500">/10</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                                className={`h-full bg-gradient-to-r ${getScoreGradient(summary?.averageScore || 0)} transition-all duration-1000 ease-out`}
                                style={{ width: `${(summary?.averageScore || 0) * 10}%` }}
                            ></div>
                        </div>
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
                            {summary?.totalInterviews || 0}
                        </div>
                        <p className="text-sm text-slate-400">Completed sessions</p>
                    </div>

                    {/* Strong Points Card */}
                    <div className="stealth-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Strong Points</h3>
                            <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            {summary?.strongPoints || 'Complete interviews to discover your strengths!'}
                        </p>
                    </div>
                </div>

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
