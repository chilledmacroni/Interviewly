import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, LoginRequest, RegisterRequest, AuthResponse } from '../types';
import { login as apiLogin, register as apiRegister } from '../services/api';

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (data: LoginRequest) => Promise<void>;
    register: (data: RegisterRequest) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
    }, []);

    const login = async (data: LoginRequest) => {
        const response = await apiLogin(data);
        handleAuthSuccess(response);
    };

    const register = async (data: RegisterRequest) => {
        const response = await apiRegister(data);
        handleAuthSuccess(response);
    };

    const handleAuthSuccess = (response: AuthResponse) => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify({
            id: response.id,
            email: response.email,
            firstName: response.firstName
        }));
        setToken(response.token);
        setUser({
            id: response.id,
            email: response.email,
            firstName: response.firstName
        });
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
