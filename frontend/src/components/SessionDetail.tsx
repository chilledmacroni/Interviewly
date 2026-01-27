import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getSessionDetail } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface SessionDetail {
    id: string;
    date: string;
    techStack: string;
    difficulty: string;
    overallScore: number;
    transcript: ConversationTurn[];
    scores: QuestionScore[];
    overallFeedback: string;
}

interface ConversationTurn {
    role: string;
    content: string;
    timestamp: string;
    score?: number;
}

interface QuestionScore {
    questionNumber: number;
    question: string;
    answer: string;
    score: number;
    feedback: string;
}

export const SessionDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [session, setSession] = useState<SessionDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (id) {
            loadSessionDetail(id);
        }
    }, [id]);

    const loadSessionDetail = async (sessionId: string) => {
        try {
            setIsLoading(true);
            const data = await getSessionDetail(sessionId);
            setSession(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load session');
        } finally {
            setIsLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 8) return 'text-emerald-400';
        if (score >= 6) return 'text-yellow-400';
        return 'text-rose-400';
    };

    const getScoreBgColor = (score: number) => {
        if (score >= 8) return 'bg-emerald-500/20 border-emerald-500/50';
        if (score >= 6) return 'bg-yellow-500/20 border-yellow-500/50';
        return 'bg-rose-500/20 border-rose-500/50';
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <div className="text-center">
                    <svg className="animate-spin h-12 w-12 text-emerald-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-slate-400">Loading session details...</p>
                </div>
            </div>
        );
    }

    if (error || !session) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-rose-400 mb-4">{error || 'Session not found'}</p>
                    <button onClick={() => navigate('/dashboard')} className="btn-neon">
                        Back to Dashboard
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
                    <Link to="/dashboard" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Dashboard</Link>
                    <div className="h-4 w-px bg-slate-800"></div>
                    <span className="text-slate-400 text-sm">Hi, {user?.firstName}</span>
                    <button onClick={logout} className="text-rose-400 hover:text-rose-300 text-sm font-medium">Logout</button>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-6 py-12">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center text-slate-400 hover:text-white transition-colors mb-6 text-sm"
                >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Dashboard
                </button>

                {/* Session Header */}
                <div className="stealth-card p-8 mb-8">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">{session.techStack} Interview</h1>
                            <p className="text-slate-400">
                                {new Date(session.date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className={`text-5xl font-bold mb-2 ${getScoreColor(session.overallScore)}`}>
                                {session.overallScore.toFixed(1)}
                                <span className="text-2xl text-slate-500">/10</span>
                            </div>
                            <span className={`inline-flex px-3 py-1 rounded text-sm font-medium ${session.difficulty === 'hard' ? 'bg-rose-500/20 text-rose-400' :
                                    session.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-emerald-500/20 text-emerald-400'
                                }`}>
                                {session.difficulty}
                            </span>
                        </div>
                    </div>

                    {/* Overall Feedback */}
                    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                        <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Overall Performance
                        </h3>
                        <p className="text-slate-300 leading-relaxed whitespace-pre-line">{session.overallFeedback}</p>
                    </div>
                </div>

                {/* Question Breakdown */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white mb-4">Question Breakdown</h2>

                    {session.scores.map((score, index) => (
                        <div key={index} className="stealth-card p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="text-sm font-semibold text-slate-500">Question {score.questionNumber}</span>
                                        <span className={`px-3 py-1 rounded-lg text-sm font-bold border ${getScoreBgColor(score.score)} ${getScoreColor(score.score)}`}>
                                            {score.score}/10
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-4">{score.question}</h3>
                                </div>
                            </div>

                            {/* Your Answer */}
                            <div className="mb-4">
                                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Your Answer</h4>
                                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                                    <p className="text-slate-300 leading-relaxed">{score.answer}</p>
                                </div>
                            </div>

                            {/* Feedback */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Feedback</h4>
                                <div className="bg-emerald-500/5 rounded-lg p-4 border border-emerald-500/20">
                                    <p className="text-slate-300 leading-relaxed">{score.feedback}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 mt-8">
                    <Link to="/dashboard" className="flex-1 btn-neon text-center">
                        Back to Dashboard
                    </Link>
                    <Link to="/" className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 px-6 rounded-lg transition-colors text-center">
                        Start New Interview
                    </Link>
                </div>
            </main>
        </div>
    );
};
