import React from 'react';

interface ActionableTipsProps {
    tips?: string[];
}

export const ActionableTips: React.FC<ActionableTipsProps> = ({ tips = [] }) => {
    // Default empty state tips
    const displayTips = tips.length > 0 ? tips : [
        "Start typing to receive real-time feedback",
        "Use the STAR method for behavioral questions",
        "Be specific with examples and metrics"
    ];

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mt-4">
            <div className="flex items-center gap-2 mb-4">
                <span className="text-emerald-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                </span>
                <h3 className="text-white font-semibold text-sm">Actionable Tips</h3>
            </div>

            <div className="space-y-3">
                {displayTips.map((tip, idx) => (
                    <div key={idx} className="bg-slate-950/50 rounded-lg p-3 text-sm text-slate-300 flex items-start gap-3 border border-slate-800/50">
                        <svg className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {tip}
                    </div>
                ))}
            </div>
        </div>
    );
};
