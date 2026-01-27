import React, { useEffect, useState } from 'react';
import { getHistory } from '../services/api';
import { Link } from 'react-router-dom';

interface InterviewSession {
    id: string;
    techStack: string;
    difficulty: string;
    createdAt: string;
    status: string;
    overallScore?: number;
    completedAt?: string;
}

export const HistoryDashboard: React.FC = () => {
    const [history, setHistory] = useState<InterviewSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await getHistory();
                setHistory(data);
            } catch (err) {
                setError('Failed to load history');
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getScoreColor = (score?: number) => {
        if (score === undefined) return 'bg-slate-800 text-slate-400';
        if (score >= 8) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        if (score >= 6) return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
        if (score >= 4) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    };

    return (
        <div className="min-h-screen bg-[#020617] p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Your Interviews</h1>
                        <p className="text-slate-400 mt-1">Track your progress and performance over time</p>
                    </div>
                    <Link to="/" className="btn-neon flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        New Interview
                    </Link>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <svg className="animate-spin h-8 w-8 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    </div>
                ) : error ? (
                    <div className="text-rose-400 bg-rose-500/10 p-4 rounded-xl border border-rose-500/20 text-center">
                        {error}
                    </div>
                ) : history.length === 0 ? (
                    <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-slate-800 border-dashed">
                        <div className="text-slate-500 mb-4">No interviews yet</div>
                        <Link to="/" className="text-emerald-400 hover:underline">Start your first interview</Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {history.map((session) => (
                            <div key={session.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-slate-950 border border-slate-800 px-3 py-1 rounded-lg text-xs font-mono text-slate-400 group-hover:border-emerald-500/30 transition-colors">
                                        {formatDate(session.createdAt)}
                                    </div>
                                    <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getScoreColor(session.overallScore)}`}>
                                        {session.overallScore !== undefined ? session.overallScore : '-'} / 10
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">{session.techStack}</h3>
                                <div className="text-sm text-slate-500 capitalize mb-4">{session.difficulty} Difficulty</div>

                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800/50">
                                    <div className={`text-xs px-2 py-1 rounded capitalize ${session.status === 'completed' ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                                        {session.status}
                                    </div>
                                    {session.status === 'completed' ? (
                                        <span className="text-slate-600 text-xs">View Summary →</span>
                                    ) : (
                                        <span className="text-emerald-500 text-xs font-medium">Resume →</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
