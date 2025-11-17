import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { supabase } from '../services/supabase';
import './AuthModal.css';

function AuthModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('signup'); // 'signup' or 'login'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  if (!isOpen) return null;

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
      
      await supabase.auth.setSession({
        access_token: loginResponse.data.access_token,
        refresh_token: loginResponse.data.refresh_token || loginResponse.data.access_token
      });
      
      onClose();
      navigate('/dashboard', {
        state: {
          loginSuccess: true,
          message: '🎉 Welcome! You have 60 free minutes to get started.'
        }
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
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
      
      await supabase.auth.setSession({
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token || response.data.access_token
      });
      
      onClose();
      navigate('/dashboard', {
        state: {
          loginSuccess: true,
          message: `Welcome back, ${email}!`
        }
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
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

