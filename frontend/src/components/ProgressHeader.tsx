interface ProgressHeaderProps {
    questionNumber: number;
    totalQuestions: number;
    techStack: string;
    difficulty: string;
}

export function ProgressHeader({
    questionNumber,
    totalQuestions,
    techStack,
    difficulty,
}: ProgressHeaderProps) {
    const progress = (questionNumber / totalQuestions) * 100;

    const difficultyColors = {
        easy: 'text-[var(--success-400)]',
        medium: 'text-[var(--warning-400)]',
        hard: 'text-[var(--error-400)]',
    };

    return (
        <div className="glass-card p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary-500)] to-[var(--accent-500)] flex items-center justify-center">
                        <span className="text-white font-bold">{questionNumber}</span>
                    </div>
                    <div>
                        <h2 className="font-semibold text-[var(--text-primary)]">
                            Question {questionNumber} of {totalQuestions}
                        </h2>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-[var(--text-muted)]">{techStack}</span>
                            <span className="text-[var(--text-muted)]">•</span>
                            <span
                                className={`capitalize font-medium ${difficultyColors[difficulty as keyof typeof difficultyColors] ||
                                    'text-[var(--text-secondary)]'
                                    }`}
                            >
                                {difficulty}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="text-right">
                    <span className="text-2xl font-bold gradient-text">
                        {Math.round(progress)}%
                    </span>
                    <p className="text-xs text-[var(--text-muted)]">Complete</p>
                </div>
            </div>

            <div className="progress-bar">
                <div
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}
