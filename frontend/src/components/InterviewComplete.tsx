import { type InterviewSummary } from '../types';
import { ScoreBadge } from './ScoreCard';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

interface InterviewCompleteProps {
    summary: InterviewSummary;
    onRestart: () => void;
}

export function InterviewComplete({ summary, onRestart }: InterviewCompleteProps) {
    const { user } = useAuth();
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

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-2xl w-full space-y-6">
                {/* Main Score Card */}
                <div className="glass-card p-8 text-center message-enter">
                    <div className="text-6xl mb-4">{getGradeEmoji(summary.overallScore)}</div>
                    <h1 className="text-3xl font-bold gradient-text mb-2">
                        Interview Complete
                    </h1>
                    <p className="text-xl text-[var(--text-secondary)] mb-6">
                        {getGradeText(summary.overallScore)}
                    </p>

                    <div className="flex justify-center mb-6">
                        <div className="glass-card px-8 py-4 inline-flex items-center gap-4">
                            <div className="text-left">
                                <p className="text-sm text-[var(--text-muted)]">Overall Score</p>
                                <p className="text-4xl font-bold gradient-text">
                                    {summary.overallScore.toFixed(1)}
                                </p>
                            </div>
                            <div className="w-px h-12 bg-[var(--glass-border)]" />
                            <div className="text-left">
                                <p className="text-sm text-[var(--text-muted)]">Questions</p>
                                <p className="text-4xl font-bold text-[var(--text-primary)]">
                                    {summary.questionsAnswered}
                                </p>
                            </div>
                        </div>
                    </div>

                    <p className="text-[var(--text-secondary)] leading-relaxed max-w-lg mx-auto">
                        {summary.overallFeedback}
                    </p>
                </div>

                {/* Question Breakdown */}
                <div className="glass-card p-6" style={{ animationDelay: '0.2s' }}>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <span className="text-[var(--accent-400)]">📊</span>
                        Question Breakdown
                    </h2>

                    <div className="space-y-4">
                        {summary.questionScores.map((qs, index) => (
                            <div
                                key={index}
                                className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--glass-border)]"
                            >
                                <div className="flex items-start gap-3">
                                    <ScoreBadge score={qs.score} size="sm" />
                                    <div className="flex-1">
                                        <p className="font-medium text-[var(--text-primary)] mb-1">
                                            Q{qs.questionNumber}: {qs.question.slice(0, 100)}
                                            {qs.question.length > 100 ? '...' : ''}
                                        </p>
                                        <p className="text-sm text-[var(--text-secondary)]">
                                            {qs.feedback}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Guest User CTA */}
                {!user && (
                    <div className="glass-card p-8 border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-teal-500/10" style={{ animationDelay: '0.3s' }}>
                        <div className="text-center">
                            <div className="text-4xl mb-4">🎯</div>
                            <h2 className="text-2xl font-bold text-white mb-3">
                                Sign Up to Save Your Results!
                            </h2>
                            <p className="text-slate-300 mb-6 max-w-lg mx-auto">
                                Create a free account to track your progress, view detailed analytics, and see how you improve over time.
                            </p>

                            {/* Benefits Grid */}
                            <div className="grid md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                                    <div className="text-2xl mb-2">📊</div>
                                    <p className="text-sm text-slate-300 font-medium">Track Progress</p>
                                    <p className="text-xs text-slate-400 mt-1">See your improvement over time</p>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                                    <div className="text-2xl mb-2">💡</div>
                                    <p className="text-sm text-slate-300 font-medium">AI Insights</p>
                                    <p className="text-xs text-slate-400 mt-1">Get personalized strong points</p>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                                    <div className="text-2xl mb-2">📝</div>
                                    <p className="text-sm text-slate-300 font-medium">Full History</p>
                                    <p className="text-xs text-slate-400 mt-1">Access all past interviews</p>
                                </div>
                            </div>

                            <Link
                                to="/register"
                                className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-bold px-8 py-4 rounded-lg hover:shadow-lg hover:shadow-emerald-500/50 transition-all text-lg"
                            >
                                Create Free Account
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </Link>
                            <p className="text-xs text-slate-400 mt-3">Already have an account? <Link to="/login" className="text-emerald-400 hover:text-emerald-300">Sign in</Link></p>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-center gap-4">
                    <button
                        onClick={onRestart}
                        className="btn-primary px-8 py-4 text-lg flex items-center gap-2"
                    >
                        <span>🔄</span>
                        Start New Interview
                    </button>
                </div>
            </div>
        </div>
    );
}
