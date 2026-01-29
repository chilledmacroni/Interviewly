import { type Message } from '../types';
import { ScoreCard } from './ScoreCard';

interface ChatMessageProps {
    message: Message;
    onSpeak?: (messageId: string, text: string) => void;
    isSpeaking?: boolean;
    isGeneratingAudio?: boolean;
}

export function ChatMessage({ message, onSpeak, isSpeaking, isGeneratingAudio }: ChatMessageProps) {
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
                <div className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center justify-between ${isInterviewer ? 'text-emerald-400' : 'text-emerald-100'
                    }`}>
                    <div className="flex items-center">
                        {isInterviewer ? (
                            <>
                                <div className="w-4 h-4 rounded-sm bg-emerald-500 flex items-center justify-center text-slate-900 mr-2">
                                    <span className="text-[10px]">AI</span>
                                </div>
                                Interviewer
                            </>
                        ) : 'You'}
                    </div>
                    
                    {/* Speaker button for interviewer messages */}
                    {isInterviewer && onSpeak && (
                        <button
                            onClick={() => onSpeak(message.id, message.content)}
                            disabled={isGeneratingAudio}
                            className={`ml-2 p-1.5 rounded-lg transition-all ${
                                isSpeaking 
                                    ? 'bg-emerald-500/20 text-emerald-400' 
                                    : 'hover:bg-slate-700/50 text-slate-400 hover:text-emerald-400'
                            } ${isGeneratingAudio ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                            title={isSpeaking ? 'Stop speaking' : 'Read aloud (Alt+S)'}
                            aria-label={isSpeaking ? 'Stop speaking question' : 'Read question aloud'}
                            aria-pressed={isSpeaking}
                            aria-busy={isGeneratingAudio}
                        >
                            {isGeneratingAudio ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : isSpeaking ? (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                    )}
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
    onSpeak?: (messageId: string, text: string) => void;
    speakingMessageId?: string | null;
    generatingAudioMessageId?: string | null;
}

export function ChatMessages({ messages, isLoading, onSpeak, speakingMessageId, generatingAudioMessageId }: ChatMessagesProps) {
    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
                <div key={message.id}>
                    <ChatMessage 
                        message={message} 
                        onSpeak={onSpeak}
                        isSpeaking={speakingMessageId === message.id}
                        isGeneratingAudio={generatingAudioMessageId === message.id}
                    />
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
