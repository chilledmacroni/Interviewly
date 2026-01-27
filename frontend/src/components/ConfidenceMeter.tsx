import React from 'react';

interface ConfidenceMeterProps {
    score: number; // 0-10
}

export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({ score }) => {
    // Calculate rotation for the needle/fill
    // 0 = -90deg, 10 = 90deg => range 180deg
    const percentage = (score / 10) * 100;

    let colorClass = 'text-red-500';
    let label = 'Needs Work';

    if (score >= 8) {
        colorClass = 'text-emerald-500';
        label = 'Excellent';
    } else if (score >= 5) {
        colorClass = 'text-yellow-500';
        label = 'Good';
    }

    // SVG Drop
    // SVG Drop
    // const radius = 40;
    // const circumference = 2 * Math.PI * radius; // Full circle
    // const halfCircumference = circumference / 2;
    // const strokeDashoffset = halfCircumference - (percentage / 100) * halfCircumference;

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
                <span className="text-emerald-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </span>
                <h3 className="text-white font-semibold">AI Coach</h3>
            </div>

            <div className="text-slate-400 text-sm mb-4">Real-time feedback & scoring</div>

            <div className="bg-slate-950/50 rounded-xl p-6 flex flex-col items-center justify-center relative">
                <h4 className="text-sm font-medium text-slate-300 w-full mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    Confidence Meter
                </h4>

                <div className="relative w-48 h-28 overflow-hidden mb-2">
                    {/* Background Arc */}
                    <div className="w-48 h-48 rounded-full border-[12px] border-slate-800 box-border absolute top-0 left-0"></div>

                    {/* Foreground Arc (using CSS rotation/masking or SVG) */}
                    <svg className="w-48 h-48 -rotate-90 absolute top-0 left-0">
                        <circle
                            cx="96"
                            cy="96"
                            r="88" // 96 - (12/2) - padding
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="12"
                            strokeDasharray={`${2 * Math.PI * 88}`}
                            strokeDashoffset={(2 * Math.PI * 88) * (1 - percentage / 200)}
                            strokeLinecap="round"
                            className={`${colorClass} transition-all duration-1000 ease-out`}
                        />
                    </svg>

                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center pb-2">
                        <div className={`text-3xl font-bold ${colorClass}`}>
                            {score.toFixed(1)}
                            <span className="text-sm text-slate-500 font-normal">/10</span>
                        </div>
                    </div>
                </div>

                <div className={`text-sm font-medium ${colorClass} mt-2`}>
                    {label}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                    Based on response quality and clarity
                </div>
            </div>
        </div>
    );
};
