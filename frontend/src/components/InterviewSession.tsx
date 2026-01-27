import React, { useState, useEffect, useRef } from 'react';
import { type InterviewConfig, type Message } from '../types';
import { startInterview, submitAnswer } from '../services/api';
import { ChatMessages } from './ChatMessage';
import { ConfidenceMeter } from './ConfidenceMeter';
import { ActionableTips } from './ActionableTips';
import { JdAlignment } from './JdAlignment';

interface InterviewSessionProps {
    config: InterviewConfig;
    onExit: () => void;
}

export const InterviewSession: React.FC<InterviewSessionProps> = ({ config, onExit }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [currentScore, setCurrentScore] = useState(0);
    const [currentTips, setCurrentTips] = useState<string[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    useEffect(() => {
        const initSession = async () => {
            setIsLoading(true);
            try {
                const response = await startInterview({
                    techStack: config.techStack,
                    difficulty: config.difficulty,
                    resumeText: config.resumeText,
                    jdUrl: config.jdUrl
                });

                console.log('[DEBUG] Interview response:', response);
                console.log('[DEBUG] Question received:', response.question);
                console.log('[DEBUG] Resume text length:', config.resumeText?.length || 0);
                console.log('[DEBUG] JD URL:', config.jdUrl);

                if (response.sessionId) {
                    setSessionId(response.sessionId);
                } else {
                    console.error('Session ID missing from response');
                    throw new Error('Session ID missing');
                }
                
                const question = response.question || "I'm ready to start the interview. Let's begin!";
                setMessages([
                    {
                        id: 'system-1',
                        role: 'system',
                        content: `Interview initialized for ${config.techStack} (${config.difficulty})`,
                        timestamp: new Date()
                    },
                    {
                        id: '1',
                        role: 'interviewer',
                        content: question,
                        timestamp: new Date()
                    }
                ]);
            } catch (error) {
                console.error('Failed to start interview:', error);
                setMessages(prev => [...prev, {
                    id: 'error',
                    role: 'system',
                    content: 'Failed to initialize interview. Please try again.',
                    timestamp: new Date()
                }]);
            } finally {
                setIsLoading(false);
            }
        };

        initSession();
    }, [config]);

    const handleSend = async () => {
        if (!input.trim() || !sessionId || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'candidate',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const result = await submitAnswer({
                sessionId,
                answer: userMessage.content
            });

            // Update score if available
            if (result.score) {
                setCurrentScore(result.score.score);
                if (result.score.improvements) {
                    setCurrentTips(result.score.improvements.slice(0, 3));
                }
            }

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'interviewer',
                content: result.interviewResponse.question || "Interview Complete.",
                timestamp: new Date(),
                score: result.score
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Failed to submit answer:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[#020617] text-slate-200 font-sans overflow-hidden">
            {/* Top Bar */}
            <header className="h-16 border-b border-slate-800 bg-slate-950/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-20">
                <div className="flex items-center gap-6">
                    <button onClick={onExit} className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <div className="flex items-center gap-2 font-bold text-white text-lg">
                        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-black">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path d="M12.378 1.602a.75.75 0 00-.756 0L3 6.632l9 5.25 9-5.25-8.622-5.03zM21.75 7.93l-9 5.25v9l8.628-5.032a.75.75 0 00.372-.648V7.93zM11.25 22.18v-9l-9-5.25v8.57a.75.75 0 00.372.648l8.628 5.033z" />
                            </svg>
                        </div>
                        Interviewly
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-slate-900 rounded-full px-4 py-1.5 border border-slate-800 flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        <span className="text-white font-medium">Interview Session</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-emerald-400">Active</span>
                    </div>
                </div>
            </header>

            {/* Split Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Chat Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-[#020617] relative">

                    {/* Chat Header / Agentic Flow Banner */}
                    <div className="p-6 pb-2">
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7V5.73C9.4 5.39 9 4.74 9 4a2 2 0 012-2z" /></svg>
                                </div>
                                <div>
                                    <div className="text-emerald-400 font-semibold flex items-center gap-2">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                        Agentic Flow Active
                                    </div>
                                    <div className="text-slate-500 text-sm">Interview ready!</div>
                                </div>
                            </div>

                            {/* Steps */}
                            <div className="flex items-center gap-4 text-xs font-medium">
                                <div className="flex flex-col items-center gap-1 opacity-50">
                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">1</div>
                                    <span className="text-slate-500">Scraping</span>
                                </div>
                                <div className="w-8 h-0.5 bg-slate-800"></div>
                                <div className="flex flex-col items-center gap-1 opacity-50">
                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">2</div>
                                    <span className="text-slate-500">Analyzing</span>
                                </div>
                                <div className="w-8 h-0.5 bg-slate-800"></div>
                                <div className="flex flex-col items-center gap-1">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-black font-bold">3</div>
                                    <span className="text-emerald-400">Ready</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Messages List */}
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                        <div className="max-w-3xl mx-auto space-y-6">
                            {/* AI Header Bubbles typically have a header */}
                            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 mb-8">
                                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-800/50">
                                    <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    </div>
                                    <div>
                                        <div className="text-white font-medium text-sm">AI Interviewer</div>
                                        <div className="text-slate-500 text-xs">Technical Interview Session</div>
                                    </div>
                                    <div className="ml-auto flex gap-2">
                                        <button className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 transition-colors flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                            Record
                                        </button>
                                        <button onClick={onExit} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 transition-colors">
                                            End Session
                                        </button>
                                    </div>
                                </div>
                                <div className="text-slate-300 text-sm leading-relaxed">
                                    Hello! I'm your AI interviewer today, and I'll be conducting a practice interview for this position. I've reviewed the requirements. Let's begin with your first question.
                                </div>
                            </div>

                            <ChatMessages messages={messages.slice(2)} isLoading={isLoading} />
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="p-6 pt-2">
                        <div className="max-w-3xl mx-auto bg-slate-900/80 border border-slate-800 rounded-xl p-2 pl-4 flex items-center gap-2 focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all">
                            <input
                                type="text"
                                className="flex-1 bg-transparent border-none outline-none text-slate-200 placeholder-slate-600 text-sm py-2"
                                placeholder="Type your response..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                disabled={isLoading}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading}
                                className="w-10 h-10 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center justify-center text-white transition-colors"
                            >
                                {isLoading ? (
                                    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : (
                                    <svg className="w-4 h-4 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                )}
                            </button>
                        </div>
                        <div className="text-center text-xs text-slate-600 mt-2">
                            Press Enter to send, Shift+Enter for new line
                        </div>
                    </div>
                </div>

                {/* Right: Analysis Panel */}
                <div className="w-96 bg-[#020617] border-l border-slate-800 p-6 overflow-y-auto hidden xl:block">
                    <ConfidenceMeter score={currentScore} />
                    <ActionableTips tips={currentTips} />
                    <JdAlignment />
                </div>
            </div>
        </div>
    );
};
