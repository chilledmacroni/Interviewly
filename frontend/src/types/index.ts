// API Request/Response Types

export interface StartInterviewRequest {
    techStack: string;
    difficulty: 'easy' | 'medium' | 'hard';
    resumeText?: string;
    jdUrl?: string;
}

export interface SubmitAnswerRequest {
    sessionId: string;
    answer: string;
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
    feedback: string;
    strengths: string[];
    improvements: string[];
}

export interface AnswerResponse {
    interviewResponse: InterviewResponse;
    score: ScoreResult;
}

export interface InterviewSummary {
    overallScore: number;
    questionsAnswered: number;
    questionScores: QuestionScore[];
    overallFeedback: string;
}

export interface QuestionScore {
    questionNumber: number;
    question: string;
    answer: string;
    score: number;
    feedback: string;
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
    jdUrl?: string;
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
