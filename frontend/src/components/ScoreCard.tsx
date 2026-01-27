import { type ScoreResult } from '../types';

interface ScoreBadgeProps {
    score: number;
    size?: 'sm' | 'md' | 'lg';
}

export function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
    const getColors = () => {
        if (score >= 8) return 'bg-emerald-500 text-black shadow-emerald-500/50';
        if (score >= 6) return 'bg-teal-500 text-black shadow-teal-500/50';
        if (score >= 4) return 'bg-yellow-500 text-black shadow-yellow-500/50';
        return 'bg-rose-500 text-white shadow-rose-500/50';
    };

    const sizeClasses = {
        sm: 'w-8 h-8 text-sm',
        md: 'w-12 h-12 text-lg',
        lg: 'w-16 h-16 text-2xl',
    };

    return (
        <div className={`
            flex items-center justify-center font-bold rounded-xl shadow-lg
            ${getColors()} 
            ${sizeClasses[size]}
        `}>
            {score}
        </div>
    );
}

interface ScoreCardProps {
    score: ScoreResult;
    questionNumber?: number;
    animate?: boolean;
}

export function ScoreCard({ score, questionNumber, animate = true }: ScoreCardProps) {
    return (
        <div className={`
            bg-slate-900/90 border border-slate-700/50 rounded-2xl p-5 max-w-2xl
            ${animate ? 'animate-fade-in-up' : ''}
        `}>
            <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-1">
                    <ScoreBadge score={score.score} />
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Score</span>
                </div>

                <div className="flex-1 space-y-4">
                    {questionNumber && (
                        <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
                            Evaluation for Question {questionNumber}
                        </h4>
                    )}

                    <p className="text-slate-300 leading-relaxed text-sm border-l-2 border-slate-700 pl-3">
                        {score.feedback}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {score.strengths.length > 0 && (
                            <div className="bg-emerald-500/5 rounded-lg p-3 border border-emerald-500/10">
                                <h4 className="text-xs font-bold text-emerald-400 mb-2 uppercase flex items-center">
                                    <svg className="w-3 h-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    Strengths
                                </h4>
                                <ul className="space-y-1.5">
                                    {score.strengths.map((s, i) => (
                                        <li key={i} className="text-xs text-slate-400 flex items-start">
                                            <span className="mr-1.5 mt-0.5 w-1 h-1 bg-emerald-500 rounded-full shrink-0" />
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {score.improvements.length > 0 && (
                            <div className="bg-amber-500/5 rounded-lg p-3 border border-amber-500/10">
                                <h4 className="text-xs font-bold text-amber-400 mb-2 uppercase flex items-center">
                                    <svg className="w-3 h-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                                    Improvements
                                </h4>
                                <ul className="space-y-1.5">
                                    {score.improvements.map((imp, i) => (
                                        <li key={i} className="text-xs text-slate-400 flex items-start">
                                            <span className="mr-1.5 mt-0.5 w-1 h-1 bg-amber-500 rounded-full shrink-0" />
                                            {imp}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
