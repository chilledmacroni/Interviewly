import React from 'react';

export const JdAlignment: React.FC = () => {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mt-4">
            <div className="flex items-center gap-2 mb-4">
                <span className="text-emerald-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </span>
                <h3 className="text-white font-semibold text-sm">JD Alignment</h3>
            </div>

            <div className="mb-4">
                <div className="flex justify-between text-xs mb-2">
                    <span className="text-emerald-400 font-bold text-lg">0%</span>
                    <span className="text-slate-500">Needs Alignment</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[5%]" />
                </div>
            </div>

            <div>
                <div className="text-xs text-slate-500 mb-2">Key Requirements</div>
                <div className="flex flex-wrap gap-2">
                    {['React', 'TypeScript', 'Node.js', 'AWS', 'Scale', 'Team', 'Lead', 'Comm', 'Problem Solving'].map((tag) => (
                        <span key={tag} className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-400 flex items-center gap-1">
                            <span className="text-slate-600">×</span> {tag}
                        </span>
                    ))}
                </div>
            </div>

            <div className="mt-4 text-[10px] text-slate-600 border-t border-slate-800 pt-3">
                Try incorporating more keywords from the job description
            </div>
        </div>
    );
};
