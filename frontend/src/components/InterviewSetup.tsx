import React, { useState } from 'react';
import type { InterviewConfig } from '../types';

import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { uploadResume } from '../services/api';

interface InterviewSetupProps {
    onStart: (config: InterviewConfig) => void;
    isLoading: boolean;
}

const InterviewSetup: React.FC<InterviewSetupProps> = ({ onStart, isLoading }) => {
    const [techStack, setTechStack] = useState('');
    const [difficulty, setDifficulty] = useState<InterviewConfig['difficulty']>('medium');
    const [resumeText, setResumeText] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isUploadingResume, setIsUploadingResume] = useState(false);
    const [resumeFileName, setResumeFileName] = useState<string>('');
    const { user, logout } = useAuth();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate that user provided a resume
        if (!resumeText) {
            alert('Please upload or paste your resume');
            return;
        }

        // Allow both authenticated and guest users to start interviews
        onStart({
            techStack: techStack || 'General Technical Interview',
            difficulty,
            resumeText,
            inputType: 'resume'
        });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            readResumeFile(file);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            readResumeFile(e.target.files[0]);
        }
    };

    const readResumeFile = async (file: File) => {
        // Validate file type - only PDF and DOCX
        const isValidType = file.name.toLowerCase().endsWith('.pdf') || file.name.toLowerCase().endsWith('.docx');
        
        if (!isValidType) {
            alert('Please upload a PDF or DOCX file');
            return;
        }

        // Upload to backend for extraction
        setIsUploadingResume(true);
        try {
            const result = await uploadResume(file);
            
            if (!result.success) {
                alert(`Failed to extract resume: ${result.error || 'Unknown error'}`);
                setResumeFileName('');
                return;
            }
            
            setResumeText(result.text);
            setResumeFileName(file.name);
        } catch (error) {
            console.error('Resume upload error:', error);
            alert(`Failed to upload resume: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setResumeFileName('');
        } finally {
            setIsUploadingResume(false);
        }
    };

    return (
        <div className="min-h-screen text-slate-300 font-sans selection:bg-emerald-500/30">
            {/* Navbar */}
            <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
                <div className="flex items-center space-x-2 text-white font-bold text-xl tracking-tight">
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-black">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M12.378 1.602a.75.75 0 00-.756 0L3 6.632l9 5.25 9-5.25-8.622-5.03zM21.75 7.93l-9 5.25v9l8.628-5.032a.75.75 0 00.372-.648V7.93zM11.25 22.18v-9l-9-5.25v8.57a.75.75 0 00.372.648l8.628 5.033z" />
                        </svg>
                    </div>
                    <span>Interviewly</span>
                </div>

                {user ? (
                    <div className="flex items-center gap-6">
                        <Link to="/dashboard" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Dashboard</Link>
                        <Link to="/testing" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Voice Test</Link>
                        <div className="h-4 w-px bg-slate-800"></div>
                        <span className="text-slate-400 text-sm">Hi, {user.firstName}</span>
                        <button onClick={logout} className="text-rose-400 hover:text-rose-300 text-sm font-medium">Logout</button>
                    </div>
                ) : (
                    <div className="flex items-center gap-4">
                        <Link to="/testing" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Voice Test</Link>
                        <Link to="/login" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Sign In</Link>
                        <Link to="/register" className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">Start Free</Link>
                    </div>
                )}
            </nav>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-6 py-16 md:py-24 text-center">
                {/* Badge */}
                <div className="inline-flex items-center px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm font-medium mb-8 animate-fade-in-up">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    AI-Powered Interview Preparation
                </div>

                {/* Hero Headline */}
                <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight leading-tight">
                    Master your next <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 text-glow-green">interview</span>
                </h1>

                <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
                    Drop your resume and let our AI coach
                    prepare you with personalized questions and real-time feedback.
                </p>

                {/* Main Action Card */}
                <form onSubmit={handleSubmit} className="stealth-card p-6 md:p-8 max-w-2xl mx-auto text-left relative z-10">



                    {/* Resume Upload Area */}
                    <div
                        className={`border-2 border-dashed rounded-xl p-8 mb-8 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer group
                            ${isDragging
                                ? 'border-emerald-500 bg-emerald-500/10'
                                : 'border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/50'
                            }
                            ${resumeText ? 'bg-emerald-500/5 border-emerald-500/30' : ''}
                        `}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('resume-upload')?.click()}
                    >
                        <input
                            type="file"
                            id="resume-upload"
                            className="hidden"
                            accept=".pdf,.docx"
                            onChange={handleFileChange}
                        />

                        {resumeText ? (
                            <div className="text-center">
                                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <p className="text-emerald-400 font-medium">Resume Extracted Successfully!</p>
                                <p className="text-xs text-slate-500 mt-1">{resumeFileName}</p>
                                <p className="text-xs text-slate-500 mt-1">Click to replace</p>
                            </div>
                        ) : isUploadingResume ? (
                            <div className="text-center">
                                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg className="animate-spin h-6 w-6 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                                <p className="text-emerald-400 font-medium">Extracting Resume...</p>
                                <p className="text-xs text-slate-500 mt-1">This may take a moment</p>
                            </div>
                        ) : (
                            <div className="text-center">
                                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-emerald-500/20 transition-colors">
                                    <svg className="w-6 h-6 text-slate-400 group-hover:text-emerald-400 transition-colors" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                </div>
                                <p className="text-slate-300 font-medium group-hover:text-white transition-colors">
                                    Drop your resume or click to upload
                                </p>
                                <p className="text-sm text-slate-500 mt-2">
                                    PDF or DOCX (max 10MB)
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Tech Stack Input (Hidden if not needed, or styled elegantly) */}
                    <div className="mb-8">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Technical Focus (Optional)</label>
                        <input
                            type="text"
                            className="input-stealth"
                            placeholder="e.g. React, Node.js, System Design"
                            value={techStack}
                            onChange={(e) => setTechStack(e.target.value)}
                        />
                    </div>

                    {/* Difficulty Grid */}
                    <div className="grid grid-cols-3 gap-3 mb-8">
                        {['Easy', 'Medium', 'Hard'].map((level) => (
                            <button
                                key={level}
                                type="button"
                                onClick={() => setDifficulty(level.toLowerCase() as InterviewConfig['difficulty'])}
                                className={`py-2 px-4 rounded-lg text-sm font-medium transition-all ${difficulty === level.toLowerCase()
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                                    : 'bg-slate-800/50 text-slate-400 border border-transparent hover:bg-slate-800'
                                    }`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading || isUploadingResume || (!resumeText)}
                        className="btn-neon w-full flex items-center justify-center group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Preparing Interview...
                            </>
                        ) : (
                            <>
                                Start Interview Prep
                                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </>
                        )}
                    </button>
                </form>

                {/* Features Grid */}
                <div className="grid md:grid-cols-3 gap-6 mt-20 text-left max-w-6xl mx-auto">
                    {[
                        { title: "Personalized Questions", desc: "AI analyzes your resume to generate tailored technical challenges.", icon: "code" },
                        { title: "Behavioral Scoring", desc: "Real-time evaluation of your responses using STAR methodology.", icon: "chat" },
                        { title: "Instant Feedback", desc: "Get actionable tips to strengthen your answers immediately.", icon: "bulb" }
                    ].map((feature, idx) => (
                        <div key={idx} className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-emerald-500/30 transition-colors group">
                            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4 text-emerald-500 group-hover:scale-110 transition-transform">
                                {feature.icon === 'code' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
                                {feature.icon === 'chat' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>}
                                {feature.icon === 'bulb' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
                            </div>
                            <h3 className="text-white font-semibold text-lg mb-2">{feature.title}</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default InterviewSetup;
