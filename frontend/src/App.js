import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './components/Login';
import Register from './components/Register';
import CandidateDashboard from './components/CandidateDashboard';
import EnhancedHRDashboard from './components/EnhancedHRDashboard';
import JobApplication from './components/JobApplication';
import Assessment from './components/Assessment';
import StepAssessment from './components/StepAssessment';

axios.defaults.baseURL = 'http://localhost:8000';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.get('/users/me')
        .then(response => {
          setUser(response.data);
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          <Route 
            path="/login" 
            element={!user ? <Login onLogin={login} /> : <Navigate to="/dashboard" />} 
          />
          <Route 
            path="/register" 
            element={!user ? <Register onLogin={login} /> : <Navigate to="/dashboard" />} 
          />
          <Route 
            path="/dashboard" 
            element={user ? (
              user.role === 'candidate' ? 
                <CandidateDashboard user={user} onLogout={logout} /> : 
                <EnhancedHRDashboard user={user} onLogout={logout} />
            ) : <Navigate to="/login" />} 
          />
          <Route 
            path="/apply/:jobId" 
            element={user && user.role === 'candidate' ? 
              <JobApplication user={user} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/assessment/:applicationId" 
            element={user && user.role === 'candidate' ? 
              <Assessment user={user} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/assessment/:applicationId/:round" 
            element={user && user.role === 'candidate' ? 
              <StepAssessment user={user} /> : <Navigate to="/login" />} 
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
