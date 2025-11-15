import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { supabase } from '../services/supabase';
import './AuthPage.css';

function LoginPage() {
  const [email, setEmail] = useState('testuser@gmail.com'); // Prefilled for testing
  const [password, setPassword] = useState('testpass123'); // Prefilled for testing
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    alert('Form submitted! Check console...'); // Very visible debug
    setError('');
    setLoading(true);

    try {
      console.log('=== LOGIN ATTEMPT ===');
      console.log('Email:', email);
      console.log('Calling authAPI.login...');
      
      const response = await authAPI.login(email, password);
      
      console.log('=== LOGIN SUCCESS ===');
      console.log('Full response:', response);
      console.log('Access token:', response.data?.session?.access_token);
      
      // Store token
      localStorage.setItem('access_token', response.data.session.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      alert('Login successful! Redirecting to dashboard...'); // Very visible
      
      // Navigate to dashboard
      navigate('/dashboard');
      
      console.log('=== NAVIGATION CALLED ===');
    } catch (err) {
      console.error('=== LOGIN ERROR ===');
      console.error('Error object:', err);
      console.error('Error response:', err.response);
      console.error('Error message:', err.message);
      
      alert('Login failed! Check console for details.'); // Very visible
      
      setError(err.response?.data?.error || err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>Welcome Back</h1>
        <p className="auth-subtitle">Log in to your account</p>
        
        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="message message-error">{error}</div>
          )}
          
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-options">
            <label>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>
            <Link to="/reset-password">Forgot password?</Link>
          </div>
          
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
        
        <div className="auth-divider">
          <span>──────────  OR  ──────────</span>
        </div>
        
        <div className="auth-footer">
          <p>Don't have an account? <Link to="/signup">Sign up</Link></p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

