import type {
    StartInterviewRequest,
    SubmitAnswerRequest,
    InterviewResponse,
    AnswerResponse,
    LoginRequest,
    RegisterRequest,
    AuthResponse
} from '../types';

const API_BASE_URL = '/api';

const getHeaders = () => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    const token = localStorage.getItem('token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

export const startInterview = async (request: StartInterviewRequest): Promise<InterviewResponse> => {
    const response = await fetch(`${API_BASE_URL}/interview/start`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
};

export const submitAnswer = async (request: SubmitAnswerRequest): Promise<AnswerResponse> => {
    const response = await fetch(`${API_BASE_URL}/interview/answer`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
};

export const getSession = async (sessionId: string): Promise<unknown> => {
    const response = await fetch(`${API_BASE_URL}/interview/session/${sessionId}`, {
        headers: getHeaders()
    });

    if (!response.ok) {
        throw new Error(`Session not found: ${sessionId}`);
    }

    return response.json();
};

export const login = async (request: LoginRequest): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(error.message || 'Login failed');
    }
    return response.json();
};

export const register = async (request: RegisterRequest): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Registration failed' }));
        throw new Error(error.message || 'Registration failed');
    }
    return response.json();
};

export const getHistory = async (): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/interview/history`, {
        headers: getHeaders()
    });

    if (!response.ok) {
        throw new Error('Failed to fetch history');
    }
    return response.json();
};

// Dashboard API endpoints
export const getDashboardSummary = async (): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/dashboard/summary`, {
        headers: getHeaders()
    });

    if (!response.ok) {
        throw new Error('Failed to fetch dashboard summary');
    }
    return response.json();
};

export const getSessionHistory = async (limit: number = 10): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/dashboard/sessions?limit=${limit}`, {
        headers: getHeaders()
    });

    if (!response.ok) {
        throw new Error('Failed to fetch session history');
    }
    return response.json();
};

export const getSessionDetail = async (sessionId: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/dashboard/sessions/${sessionId}`, {
        headers: getHeaders()
    });

    if (!response.ok) {
        throw new Error('Failed to fetch session detail');
    }
    return response.json();
};

// Resume extraction API endpoint
export const uploadResume = async (file: File): Promise<{ text: string; success: boolean; error?: string; skills?: string[] }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/extraction/resume`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`.replace('Bearer ', '') || undefined,
        },
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || error.error || `HTTP ${response.status}`);
    }

    return response.json();
};

