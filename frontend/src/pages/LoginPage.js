import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { supabase } from '../services/supabase';
import GoogleSignInButton from '../components/GoogleSignInButton';
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
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(email, password);
      
      // Store token
      localStorage.setItem('access_token', response.data.session.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Set Supabase session to trigger auth state change
      await supabase.auth.setSession({
        access_token: response.data.session.access_token,
        refresh_token: response.data.session.refresh_token,
      });
      
      // Navigate to dashboard with success message
      navigate('/dashboard', { 
        state: { 
          loginSuccess: true, 
          message: `Welcome back, ${response.data.user.email}!` 
        } 
      });
    } catch (err) {
      console.error('Login failed:', err.message);
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
        
        {/* Google Sign-In */}
        <GoogleSignInButton mode="signin" />
        
        <div className="auth-footer">
          <p>Don't have an account? <Link to="/signup">Sign up</Link></p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

