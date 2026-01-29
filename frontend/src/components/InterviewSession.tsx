import React, { useState, useEffect, useRef, useCallback } from 'react';
import { type InterviewConfig, type Message, type InterviewSummary, type VoiceAnalysisResult } from '../types';
import { startInterview, submitAnswer, saveInterviewProgress, speakText } from '../services/api';
import { ChatMessages } from './ChatMessage';
import { ConfidenceMeter } from './ConfidenceMeter';
import { ActionableTips } from './ActionableTips';
import { InterviewComplete } from './InterviewComplete';
import { VoiceRecorder } from './VoiceRecorder';
import { useAuth } from '../context/AuthContext';
import { playAudioFromBase64, stopAudio } from '../utils/audioUtils';

interface InterviewSessionProps {
    config: InterviewConfig;
    onExit: () => void;
}

export const InterviewSession: React.FC<InterviewSessionProps> = ({ config, onExit }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [currentScore, setCurrentScore] = useState(0);
    const [currentConfidence, setCurrentConfidence] = useState(0);
    const [currentTips, setCurrentTips] = useState<string[]>([]);
    const [currentInsights, setCurrentInsights] = useState<string[]>([]);
    const [questionNumber, setQuestionNumber] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(6);
    const [isComplete, setIsComplete] = useState(false);
    const [summary, setSummary] = useState<InterviewSummary | null>(null);
    const [isSavingProgress, setIsSavingProgress] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [wasSavedManually, setWasSavedManually] = useState(false); // Track if saved via Save & Exit
    const [voiceConfidenceScore, setVoiceConfidenceScore] = useState<number | null>(null); // Voice confidence from recording
    const [voiceAnalysis, setVoiceAnalysis] = useState<VoiceAnalysisResult | null>(null); // Full voice analysis data
    
    // TTS state
    const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState<string | null>(null);
    const [audioInstance, setAudioInstance] = useState<HTMLAudioElement | null>(null);
    const [audioCache, setAudioCache] = useState<Map<string, string>>(new Map()); // Cache audio by text hash

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const lastSpeakTimeRef = useRef<number>(0); // For debouncing

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
                    resumeText: config.resumeText
                });

                console.log('[DEBUG] Interview response:', response);
                console.log('[DEBUG] Question received:', response.question);
                console.log('[DEBUG] Resume text length:', config.resumeText?.length || 0);

                if (response.sessionId) {
                    setSessionId(response.sessionId);
                    setQuestionNumber(response.questionNumber || 1);
                    setTotalQuestions(response.totalQuestions || 6);
                } else {
                    console.error('Session ID missing from response');
                    throw new Error('Session ID missing');
                }
                
                const question = response.question || "I'm ready to start the interview. Let's begin!";
                
                // Create greeting message with user's name
                const userName = user?.firstName || 'there';
                const greetingMessage: Message = {
                    id: 'greeting',
                    role: 'interviewer',
                    content: `Hello ${userName}! Welcome to Interviewly, your interview preparation assistant. I've analyzed your resume and prepared a structured 6-question interview for you. Let's begin!`,
                    timestamp: new Date()
                };
                
                setMessages([
                    {
                        id: 'system-1',
                        role: 'system',
                        content: `Interview initialized for ${config.techStack} (${config.difficulty})`,
                        timestamp: new Date()
                    },
                    greetingMessage,
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

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioInstance) {
                stopAudio(audioInstance);
            }
        };
    }, [audioInstance]);

    // Keyboard shortcut: Alt+S to speak current question
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Alt+S or Option+S to speak the last interviewer message
            if (e.altKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                
                // Find the last interviewer message
                const lastInterviewerMessage = [...messages].reverse().find(m => m.role === 'interviewer');
                
                if (lastInterviewerMessage) {
                    console.log('[TTS] Keyboard shortcut triggered (Alt+S)');
                    handleSpeakQuestion(lastInterviewerMessage.id, lastInterviewerMessage.content);
                }
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || !sessionId || isLoading) return;

        // Stop any playing audio when submitting answer
        if (audioInstance) {
            stopAudio(audioInstance);
            setAudioInstance(null);
            setSpeakingMessageId(null);
        }

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
                answer: userMessage.content,
                voiceConfidence: voiceConfidenceScore || undefined,
                voiceAnalysis: voiceAnalysis || undefined,
            });

            // Clear voice confidence and analysis after submission
            setVoiceConfidenceScore(null);
            setVoiceAnalysis(null);

            // Update score and insights if available
            if (result.score) {
                setCurrentScore(result.score.score);
                setCurrentConfidence(result.score.confidenceScore || 0);
                if (result.score.improvements) {
                    setCurrentTips(result.score.improvements.slice(0, 3));
                }
                if (result.score.insights) {
                    setCurrentInsights(result.score.insights);
                }
            }

            // Update question progress
            if (result.interviewResponse) {
                setQuestionNumber(result.interviewResponse.questionNumber || 0);
                setTotalQuestions(result.interviewResponse.totalQuestions || 6);
                
                // Check if interview is complete
                if (result.interviewResponse.isComplete && result.interviewResponse.summary) {
                    setIsComplete(true);
                    setSummary(result.interviewResponse.summary);
                    return; // Don't add AI message if complete
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

    const handleRestart = () => {
        setIsComplete(false);
        setSummary(null);
        onExit();
    };

    const handleSpeakQuestion = async (messageId: string, text: string) => {
        try {
            // Debounce: Prevent rapid clicks (500ms cooldown)
            const now = Date.now();
            if (now - lastSpeakTimeRef.current < 500) {
                console.log('[TTS] Debounced: Too soon after last click');
                return;
            }
            lastSpeakTimeRef.current = now;

            // If already speaking this message, stop it
            if (speakingMessageId === messageId) {
                stopAudio(audioInstance);
                setAudioInstance(null);
                setSpeakingMessageId(null);
                return;
            }

            // Stop any currently playing audio
            if (audioInstance) {
                stopAudio(audioInstance);
                setAudioInstance(null);
            }

            // Check cache first
            const cachedAudio = audioCache.get(text);
            if (cachedAudio) {
                console.log('[TTS] Using cached audio');
                const audio = playAudioFromBase64(
                    cachedAudio,
                    () => {
                        setSpeakingMessageId(null);
                        setAudioInstance(null);
                    },
                    (error) => {
                        console.error('[TTS] Cached audio playback error:', error);
                        setSpeakingMessageId(null);
                        setAudioInstance(null);
                    }
                );
                setAudioInstance(audio);
                setSpeakingMessageId(messageId);
                return;
            }

            // Generate new audio
            console.log('[TTS] Generating new audio for:', text.substring(0, 50) + '...');
            setIsGeneratingAudio(messageId);
            setSpeakingMessageId(null);

            const result = await speakText(text);

            setIsGeneratingAudio(null);

            if (!result.success || !result.audioBase64) {
                console.error('[TTS] Failed to generate speech:', result.error);
                return;
            }

            // Cache the generated audio
            setAudioCache(prev => {
                const newCache = new Map(prev);
                newCache.set(text, result.audioBase64!);
                return newCache;
            });
            console.log('[TTS] Audio cached. Size:', result.fileSizeBytes, 'bytes');

            // Play the audio
            const audio = playAudioFromBase64(
                result.audioBase64,
                () => {
                    // Audio ended
                    setSpeakingMessageId(null);
                    setAudioInstance(null);
                },
                (error) => {
                    // Audio error
                    console.error('[TTS] Audio playback error:', error);
                    setSpeakingMessageId(null);
                    setAudioInstance(null);
                }
            );

            setAudioInstance(audio);
            setSpeakingMessageId(messageId);
        } catch (error) {
            console.error('[TTS] Error in handleSpeakQuestion:', error);
            setIsGeneratingAudio(null);
            setSpeakingMessageId(null);
        }
    };

    const handleVoiceTranscript = async (transcript: string, confidenceScore: number, analysis?: VoiceAnalysisResult) => {
        // Voice answers are auto-submitted - no editing allowed for interview integrity
        
        if (!transcript.trim() || !sessionId || isLoading) return;
        
        // Store and display voice analysis immediately
        setVoiceConfidenceScore(confidenceScore);
        setVoiceAnalysis(analysis || null);
        
        // Generate real-time delivery feedback
        if (analysis?.analysis) {
            const deliveryTips: string[] = [];
            
            // Filler words impact
            if (analysis.analysis.filler_words.percentage > 10) {
                deliveryTips.push(`⚠️ High filler words (${analysis.analysis.filler_words.count}) - reduces confidence score`);
            } else if (analysis.analysis.filler_words.percentage < 5) {
                deliveryTips.push('✓ Excellent clarity - minimal filler words');
            }
            
            // Speech pace impact
            const wpm = analysis.analysis.speech_pace.words_per_minute;
            if (wpm < 100) {
                deliveryTips.push('⚠️ Speaking too slowly - may signal low confidence');
            } else if (wpm > 200) {
                deliveryTips.push('⚠️ Speaking too fast - may reduce clarity score');
            } else {
                deliveryTips.push('✓ Optimal speaking pace');
            }
            
            // Tone/confidence impact
            const compound = analysis.analysis.sentiment.compound;
            if (compound < -0.3) {
                deliveryTips.push('⚠️ Hesitant tone detected - impacts overall confidence');
            } else if (compound > 0.3) {
                deliveryTips.push('✓ Confident and positive tone');
            }
            
            // Energy/engagement impact
            if (analysis.analysis.voice_quality.energy_level < 4) {
                deliveryTips.push('⚠️ Low vocal energy - may appear disengaged');
            } else if (analysis.analysis.voice_quality.energy_level > 6) {
                deliveryTips.push('✓ Strong vocal projection and energy');
            }
            
            setCurrentTips(deliveryTips);
        }
        
        // Create user message with the spoken transcript
        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'candidate',
            content: analysis?.clean_transcript || transcript, // Use clean transcript (no filler words)
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            // Submit directly to Gemini with voice analysis
            const result = await submitAnswer({
                sessionId,
                answer: userMessage.content,
                voiceConfidence: confidenceScore,
                voiceAnalysis: analysis || undefined,
            });

            // Update score and insights
            if (result.score) {
                setCurrentScore(result.score.score);
                setCurrentConfidence(result.score.confidenceScore || 0);
                if (result.score.improvements) {
                    setCurrentTips(result.score.improvements.slice(0, 3));
                }
                if (result.score.insights) {
                    setCurrentInsights(result.score.insights);
                }
            }

            // Update question progress
            if (result.interviewResponse) {
                setQuestionNumber(result.interviewResponse.questionNumber || 0);
                setTotalQuestions(result.interviewResponse.totalQuestions || 6);
                
                // Check if interview is complete
                if (result.interviewResponse.isComplete && result.interviewResponse.summary) {
                    setIsComplete(true);
                    setSummary(result.interviewResponse.summary);
                    return;
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
            console.error('Failed to submit voice answer:', error);
            setMessages(prev => [...prev, {
                id: 'error-' + Date.now(),
                role: 'system',
                content: 'Failed to submit answer. Please try again.',
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLiveTranscript = (text: string) => {
        // Update input in real-time as user speaks
        setInput(text);
    };

    const handleSaveProgress = async () => {
        if (!sessionId || !user) {
            setSaveMessage('You must be logged in to save progress');
            setTimeout(() => setSaveMessage(null), 3000);
            return;
        }

        if (questionNumber === 0) {
            setSaveMessage('Answer at least one question before saving');
            setTimeout(() => setSaveMessage(null), 3000);
            return;
        }

        setIsSavingProgress(true);
        setSaveMessage(null);

        try {
            // Save progress and get the backend-calculated result with voice metrics
            const saveResponse = await saveInterviewProgress(sessionId);
            const result = saveResponse.result;
            
            console.log('[SAVE PROGRESS] Backend calculated metrics:', {
                voiceAnswersCount: result.voiceAnswersCount,
                avgVoiceConfidence: result.averageVoiceConfidence,
                avgFillerPercentage: result.averageFillerPercentage,
                avgSpeechPace: result.averageSpeechPace,
                avgToneScore: result.averageToneScore,
                avgVocalEnergy: result.averageVocalEnergy
            });

            // Create summary from backend result (no need to recalculate)
            const progressSummary: InterviewSummary = {
                overallScore: result.overallScore,
                averageConfidence: result.averageConfidence,
                technicalAverage: result.technicalAverage,
                behavioralAverage: result.behavioralAverage,
                situationalScore: result.situationalScore,
                questionScores: result.questionScores,
                topStrengths: result.topStrengths,
                keyWeaknesses: result.keyWeaknesses,
                overallFeedback: result.overallFeedback,
                questionsAnswered: result.questionsAnswered,
                // Voice delivery metrics from backend (already calculated)
                averageVoiceConfidence: result.averageVoiceConfidence,
                averageFillerPercentage: result.averageFillerPercentage,
                averageSpeechPace: result.averageSpeechPace,
                averageToneScore: result.averageToneScore,
                averageVocalEnergy: result.averageVocalEnergy,
                voiceAnswersCount: result.voiceAnswersCount
            };

            // Show completion screen with summary
            setSummary(progressSummary);
            setIsComplete(true);
            setWasSavedManually(true); // Mark as manually saved to skip auto-save
        } catch (error: any) {
            console.error('Failed to save progress:', error);
            const errorMsg = error?.message || error?.toString() || 'Unknown error';
            setSaveMessage(`✗ Failed to save: ${errorMsg}`);
            setTimeout(() => setSaveMessage(null), 5000);
        } finally {
            setIsSavingProgress(false);
        }
    };

    // Show completion screen if interview is complete
    if (isComplete && summary) {
        return <InterviewComplete summary={summary} onRestart={handleRestart} skipAutoSave={wasSavedManually} />;
    }

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
                    {user && (
                        <button
                            onClick={handleSaveProgress}
                            disabled={isSavingProgress || questionNumber === 0}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium text-sm transition-all flex items-center gap-2"
                        >
                            {isSavingProgress ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                    </svg>
                                    Save & Exit
                                </>
                            )}
                        </button>
                    )}
                    <div className="bg-slate-900 rounded-full px-4 py-1.5 border border-slate-800 flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        <span className="text-white font-medium">Question {questionNumber} of {totalQuestions}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-emerald-400">Active</span>
                    </div>
                </div>
            </header>

            {/* Split Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Save Message Notification */}
                {saveMessage && (
                    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
                        <div className={`px-6 py-3 rounded-lg shadow-lg border ${
                            saveMessage.includes('✓') 
                                ? 'bg-emerald-900/90 border-emerald-600 text-emerald-100' 
                                : 'bg-red-900/90 border-red-600 text-red-100'
                        }`}>
                            {saveMessage}
                        </div>
                    </div>
                )}

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

                            <ChatMessages 
                                messages={messages.filter(m => m.role !== 'system')} 
                                isLoading={isLoading}
                                onSpeak={handleSpeakQuestion}
                                speakingMessageId={speakingMessageId}
                                generatingAudioMessageId={isGeneratingAudio}
                            />
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="p-6 pt-2 space-y-3">
                        {/* Voice Recorder */}
                        <div className="max-w-3xl mx-auto">
                            <VoiceRecorder 
                                onTranscriptReceived={handleVoiceTranscript}
                                onLiveTranscript={handleLiveTranscript}
                                disabled={isLoading}
                            />
                        </div>

                        {/* Text Input */}
                        <div className="max-w-3xl mx-auto bg-slate-900/80 border border-slate-800 rounded-xl p-2 pl-4 flex items-center gap-2 focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all">
                            <input
                                type="text"
                                className="flex-1 bg-transparent border-none outline-none text-slate-200 placeholder-slate-600 text-sm py-2"
                                placeholder="Type your response or use voice above..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                disabled={isLoading}
                            />
                            {voiceConfidenceScore !== null && (
                                <div className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-xs text-blue-400">
                                    Voice: {voiceConfidenceScore.toFixed(0)}/100
                                </div>
                            )}
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
                    <ConfidenceMeter score={currentScore} confidence={currentConfidence} />
                    
                    {/* Voice Delivery Metrics */}
                    {voiceAnalysis?.analysis && (
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-semibold text-white">Voice Delivery Impact</h3>
                            </div>
                            
                            <div className="space-y-4 text-sm">
                                {/* Overall Delivery Score */}
                                <div className="bg-slate-800/50 rounded-lg p-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-slate-400">Delivery Confidence</span>
                                        <span className="text-white font-bold">{voiceConfidenceScore?.toFixed(0)}/100</span>
                                    </div>
                                    <div className="w-full bg-slate-700 rounded-full h-2">
                                        <div 
                                            className={`h-2 rounded-full transition-all ${
                                                (voiceConfidenceScore || 0) >= 70 ? 'bg-green-500' : 
                                                (voiceConfidenceScore || 0) >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`}
                                            style={{ width: `${voiceConfidenceScore || 0}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">Affects final score by 30%</p>
                                </div>
                                
                                {/* Filler Words */}
                                <div className="border-l-2 border-slate-700 pl-3">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-slate-400">Filler Words</span>
                                        <span className={`font-semibold ${
                                            voiceAnalysis.analysis.filler_words.percentage > 10 ? 'text-red-400' :
                                            voiceAnalysis.analysis.filler_words.percentage > 5 ? 'text-yellow-400' :
                                            'text-green-400'
                                        }`}>
                                            {voiceAnalysis.analysis.filler_words.count} ({voiceAnalysis.analysis.filler_words.percentage.toFixed(1)}%)
                                        </span>
                                    </div>
                                    {voiceAnalysis.analysis.filler_words.percentage > 10 && (
                                        <p className="text-xs text-red-400">⚠️ High usage - reduces confidence score</p>
                                    )}
                                    {voiceAnalysis.analysis.filler_words.percentage <= 5 && (
                                        <p className="text-xs text-green-400">✓ Excellent clarity</p>
                                    )}
                                </div>
                                
                                {/* Speech Pace */}
                                <div className="border-l-2 border-slate-700 pl-3">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-slate-400">Speech Pace</span>
                                        <span className="font-semibold text-white">
                                            {voiceAnalysis.analysis.speech_pace.words_per_minute.toFixed(0)} WPM
                                        </span>
                                    </div>
                                    <p className={`text-xs ${
                                        voiceAnalysis.analysis.speech_pace.pace_rating === 'very_fast' ? 'text-yellow-400' :
                                        voiceAnalysis.analysis.speech_pace.pace_rating === 'slow' ? 'text-yellow-400' :
                                        'text-green-400'
                                    }`}>
                                        {voiceAnalysis.analysis.speech_pace.pace_rating === 'very_fast' && '⚠️ Too fast - may reduce clarity'}
                                        {voiceAnalysis.analysis.speech_pace.pace_rating === 'slow' && '⚠️ Too slow - may signal hesitation'}
                                        {(voiceAnalysis.analysis.speech_pace.pace_rating === 'normal' || voiceAnalysis.analysis.speech_pace.pace_rating === 'fast') && '✓ Optimal pace'}
                                    </p>
                                </div>
                                
                                {/* Tone/Confidence */}
                                <div className="border-l-2 border-slate-700 pl-3">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-slate-400">Tone Score</span>
                                        <span className={`font-semibold ${
                                            voiceAnalysis.analysis.sentiment.compound > 0.3 ? 'text-green-400' :
                                            voiceAnalysis.analysis.sentiment.compound < -0.3 ? 'text-red-400' :
                                            'text-yellow-400'
                                        }`}>
                                            {voiceAnalysis.analysis.sentiment.compound > 0 ? '+' : ''}{voiceAnalysis.analysis.sentiment.compound.toFixed(2)}
                                        </span>
                                    </div>
                                    <p className={`text-xs ${
                                        voiceAnalysis.analysis.sentiment.compound > 0.3 ? 'text-green-400' :
                                        voiceAnalysis.analysis.sentiment.compound < -0.3 ? 'text-red-400' :
                                        'text-yellow-400'
                                    }`}>
                                        {voiceAnalysis.analysis.sentiment.compound > 0.3 && '✓ Confident & positive'}
                                        {voiceAnalysis.analysis.sentiment.compound < -0.3 && '⚠️ Hesitant tone detected'}
                                        {Math.abs(voiceAnalysis.analysis.sentiment.compound) <= 0.3 && 'Neutral tone'}
                                    </p>
                                </div>
                                
                                {/* Voice Quality */}
                                <div className="border-l-2 border-slate-700 pl-3">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-slate-400">Vocal Energy</span>
                                        <span className={`font-semibold ${
                                            voiceAnalysis.analysis.voice_quality.energy_level > 6 ? 'text-green-400' :
                                            voiceAnalysis.analysis.voice_quality.energy_level < 4 ? 'text-red-400' :
                                            'text-yellow-400'
                                        }`}>
                                            {voiceAnalysis.analysis.voice_quality.energy_level.toFixed(1)}/10
                                        </span>
                                    </div>
                                    <p className={`text-xs ${
                                        voiceAnalysis.analysis.voice_quality.energy_level > 6 ? 'text-green-400' :
                                        voiceAnalysis.analysis.voice_quality.energy_level < 4 ? 'text-red-400' :
                                        'text-yellow-400'
                                    }`}>
                                        {voiceAnalysis.analysis.voice_quality.energy_level > 6 && '✓ Strong projection'}
                                        {voiceAnalysis.analysis.voice_quality.energy_level < 4 && '⚠️ Low energy - may appear disengaged'}
                                        {voiceAnalysis.analysis.voice_quality.energy_level >= 4 && voiceAnalysis.analysis.voice_quality.energy_level <= 6 && 'Moderate energy'}
                                    </p>
                                </div>
                                
                                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                    <p className="text-xs text-blue-300">
                                        <span className="font-semibold">Note:</span> These delivery metrics directly impact your overall score. 
                                        Even technically correct answers can receive lower scores with poor delivery.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <ActionableTips tips={currentTips} insights={currentInsights} />
                </div>
            </div>
        </div>
    );
};
