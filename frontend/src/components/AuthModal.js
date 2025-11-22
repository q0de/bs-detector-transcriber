import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { supabase } from '../services/supabase';
import './AuthModal.css';

function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [activeTab, setActiveTab] = useState('signup'); // 'signup' or 'login'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  if (!isOpen) return null;
  
  // Trigger auth success event for navbar refresh
  const triggerAuthSuccess = () => {
    // Dispatch custom event for navbar to listen
    window.dispatchEvent(new CustomEvent('authSuccess'));
    // Also call callback if provided
    if (onAuthSuccess) {
      onAuthSuccess();
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    setLoading(true);
    
    try {
      await authAPI.signup(email, password);
      const loginResponse = await authAPI.login(email, password);
      localStorage.setItem('access_token', loginResponse.data.access_token);
      
      // Store user info for navbar
      if (loginResponse.data.user) {
        localStorage.setItem('user', JSON.stringify(loginResponse.data.user));
      }
      
      // Set Supabase session
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: loginResponse.data.access_token,
        refresh_token: loginResponse.data.refresh_token || loginResponse.data.access_token
      });
      
      if (sessionError) {
        console.error('Session error:', sessionError);
      }
      
      // Trigger navbar refresh
      triggerAuthSuccess();
      
      onClose();
      navigate('/dashboard', {
        state: {
          loginSuccess: true,
          message: '🎉 Welcome! You have 60 free minutes to get started.'
        }
      });
    } catch (err) {
      // Extract error message - handle both string and object responses
      const errorData = err.response?.data?.error;
      const errorMessage = typeof errorData === 'string' ? errorData :
                          (typeof errorData === 'object' && errorData.message) ? errorData.message :
                          'Signup failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const response = await authAPI.login(email, password);
      localStorage.setItem('access_token', response.data.access_token);
      
      // Store user info for navbar
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      // Set Supabase session
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token || response.data.access_token
      });
      
      if (sessionError) {
        console.error('Session error:', sessionError);
      }
      
      // Trigger navbar refresh
      triggerAuthSuccess();
      
      onClose();
      navigate('/dashboard', {
        state: {
          loginSuccess: true,
          message: `Welcome back, ${email}!`
        }
      });
    } catch (err) {
      // Extract error message - handle both string and object responses
      const errorData = err.response?.data?.error;
      const errorMessage = typeof errorData === 'string' ? errorData :
                          (typeof errorData === 'object' && errorData.message) ? errorData.message :
                          'Login failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose}>×</button>
        
        {/* Tabs */}
        <div className="auth-modal-tabs">
          <button 
            className={`auth-modal-tab ${activeTab === 'signup' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('signup');
              setError('');
            }}
          >
            Sign Up
          </button>
          <button 
            className={`auth-modal-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('login');
              setError('');
            }}
          >
            Login
          </button>
        </div>

        {/* Signup Form */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignup} className="auth-modal-form">
            <h2>Get Started Free</h2>
            <p className="auth-modal-subtitle">60 minutes free • No credit card</p>
            
            {error && <div className="message message-error">{error}</div>}
            
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="your@email.com"
              />
            </div>
            
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength="8"
                disabled={loading}
                placeholder="8+ characters"
              />
            </div>
            
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Creating account...' : 'Sign Up Free'}
            </button>
          </form>
        )}

        {/* Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="auth-modal-form">
            <h2>Welcome Back</h2>
            <p className="auth-modal-subtitle">Login to your account</p>
            
            {error && <div className="message message-error">{error}</div>}
            
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="your@email.com"
              />
            </div>
            
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default AuthModal;

