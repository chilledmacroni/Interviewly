import { type Message } from '../types';
import { ScoreCard } from './ScoreCard';

interface ChatMessageProps {
    message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
    const isInterviewer = message.role === 'interviewer';
    const isSystem = message.role === 'system';

    if (isSystem) {
        return (
            <div className="flex justify-center my-4 animate-fade-in">
                <div className="bg-emerald-500/10 text-emerald-400 text-xs py-1 px-4 rounded-full border border-emerald-500/20">
                    {message.content}
                </div>
            </div>
        );
    }

    return (
        <div className={`flex w-full mb-6 ${isInterviewer ? 'justify-start' : 'justify-end'} message-enter`}>
            <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-5 shadow-lg relative ${isInterviewer
                    ? 'bg-slate-800/80 border border-slate-700/50 text-slate-100 rounded-tl-sm'
                    : 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-tr-sm shadow-emerald-500/20'
                }`}>
                {/* Role Badge */}
                <div className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center ${isInterviewer ? 'text-emerald-400' : 'text-emerald-100'
                    }`}>
                    {isInterviewer ? (
                        <>
                            <div className="w-4 h-4 rounded-sm bg-emerald-500 flex items-center justify-center text-slate-900 mr-2">
                                <span className="text-[10px]">AI</span>
                            </div>
                            Interviewer
                        </>
                    ) : 'You'}
                </div>

                {/* Message Content */}
                <div className="whitespace-pre-wrap leading-relaxed">
                    {message.content}
                    {message.isStreaming && (
                        <span className="inline-block w-2 h-5 ml-1 bg-current animate-pulse" />
                    )}
                </div>

                {/* Timestamp */}
                <div className={`text-[10px] mt-3 ${isInterviewer ? 'text-slate-500' : 'text-emerald-200'
                    }`}>
                    {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </div>
            </div>
        </div>
    );
}

interface ChatMessagesProps {
    messages: Message[];
    isLoading?: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
                <div key={message.id}>
                    <ChatMessage message={message} />
                    {message.score && (
                        <div className="flex justify-start mb-6 -mt-4 pl-4">
                            <ScoreCard score={message.score} />
                        </div>
                    )}
                </div>
            ))}

            {isLoading && (
                <div className="flex justify-start mb-4">
                    <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-4 rounded-tl-sm">
                        <div className="text-xs font-bold uppercase tracking-wider mb-2 text-emerald-400 flex items-center">
                            <div className="w-4 h-4 rounded-sm bg-emerald-500 flex items-center justify-center text-slate-900 mr-2">
                                <span className="text-[10px]">AI</span>
                            </div>
                            Interviewer
                        </div>
                        <div className="flex gap-1.5 h-6 items-center">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
