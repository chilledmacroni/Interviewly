// API Request/Response Types

export interface StartInterviewRequest {
    techStack: string;
    difficulty: 'easy' | 'medium' | 'hard';
    resumeText?: string;
}

export interface SubmitAnswerRequest {
    sessionId: string;
    answer: string;
    voiceConfidence?: number;
    voiceMetrics?: VoiceMetrics;
    voiceAnalysis?: VoiceAnalysisResult;
}

export interface VoiceMetrics {
    sentimentScore: number;
    sentimentLabel: string;
    fillerCount: number;
    fillerPercentage: number;
    wordsPerMinute: number;
    paceRating: string;
}

export interface VoiceAnalysisResult {
    success: boolean;
    error?: string;
    transcript: string;
    clean_transcript?: string;
    confidence_score: number;
    analysis?: {
        filler_words: {
            count: number;
            percentage: number;
            found: { [key: string]: number };
        };
        sentiment: {
            positive: number;
            neutral: number;
            negative: number;
            compound: number;
        };
        speech_pace: {
            words_per_minute: number;
            pace_rating: string;
        };
        voice_quality: {
            pitch_variation: number;
            energy_level: number;
            clarity_score: number;
        };
    };
}

export interface InterviewResponse {
    sessionId?: string;
    question?: string;
    questionNumber: number;
    totalQuestions: number;
    isComplete: boolean;
    summary?: InterviewSummary;
}

export interface ScoreResult {
    score: number;
    confidenceScore: number;
    technicalAccuracy: number;
    clarity: number;
    depth: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
    insights: string[];
}

export interface AnswerResponse {
    interviewResponse: InterviewResponse;
    score: ScoreResult;
}

export interface InterviewSummary {
    overallScore: number;
    averageConfidence: number;
    technicalAverage: number;
    behavioralAverage: number;
    situationalScore: number;
    questionScores: QuestionScore[];
    topStrengths: string[];
    keyWeaknesses: string[];
    overallFeedback: string;
    // Voice delivery metrics
    averageVoiceConfidence?: number;
    averageFillerPercentage?: number;
    averageSpeechPace?: number;
    averageToneScore?: number;
    averageVocalEnergy?: number;
    voiceAnswersCount?: number;
}

export interface VoiceDeliveryMetrics {
    fillerWordsCount: number;
    fillerWordsPercentage: number;
    speechPaceWPM: number;
    paceRating: string;
    toneScore: number; // -1 to +1 compound sentiment
    vocalEnergy: number; // 0-10
    clarity: number; // 0-10
}

export interface QuestionScore {
    questionNumber: number;
    category: string;
    question: string;
    answer: string;
    score: number;
    confidenceScore: number;
    technicalAccuracy: number;
    clarity: number;
    depth: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
    insights: string[];
    // Voice delivery metrics (null if answered with text)
    voiceConfidence?: number;
    voiceDelivery?: VoiceDeliveryMetrics;
}

// UI State Types

export interface Message {
    id: string;
    role: 'interviewer' | 'candidate' | 'system';
    content: string;
    timestamp: Date;
    score?: ScoreResult;
    isStreaming?: boolean;
}

export interface InterviewConfig {
    techStack: string;
    difficulty: 'easy' | 'medium' | 'hard';
    inputType: 'resume' | 'jd';
    resumeText?: string;
}

// Auth Types
export interface User {
    id: string;
    email: string;
    firstName: string;
}

export interface AuthResponse {
    token: string;
    email: string;
    firstName: string;
    id: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}
