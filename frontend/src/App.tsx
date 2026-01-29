import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { HistoryDashboard } from './components/HistoryDashboard';
import { Dashboard } from './components/Dashboard';
import { SessionDetail } from './components/SessionDetail';
import InterviewSetup from './components/InterviewSetup';
import { InterviewSession } from './components/InterviewSession';
import { Testing } from './components/Testing';
import type { InterviewConfig } from './types';

const PrivateRoute = ({ children }: { children: React.JSX.Element }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

const InterviewFlow = () => {
  const [config, setConfig] = useState<InterviewConfig | null>(null);

  // If session is active, show session
  if (config) {
    return <InterviewSession config={config} onExit={() => setConfig(null)} />;
  }

  // Otherwise show setup
  return <InterviewSetup onStart={setConfig} isLoading={false} />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/testing" element={<Testing />} />
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          <Route path="/session/:id" element={
            <PrivateRoute>
              <SessionDetail />
            </PrivateRoute>
          } />
          <Route path="/history" element={
            <PrivateRoute>
              <HistoryDashboard />
            </PrivateRoute>
          } />
          <Route path="/" element={<InterviewFlow />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
