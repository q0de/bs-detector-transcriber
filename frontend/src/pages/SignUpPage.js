import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import GoogleSignInButton from '../components/GoogleSignInButton';
import './AuthPage.css';

// Updated: 2025-11-17
function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const getPasswordStrength = (pwd) => {
    if (pwd.length < 8) return { strength: 'weak', color: 'red' };
    if (pwd.length < 12) return { strength: 'medium', color: 'orange' };
    return { strength: 'strong', color: 'green' };
  };

  const passwordStrength = password ? getPasswordStrength(password) : null;

  const handleSubmit = async (e) => {
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

    if (!agreeToTerms) {
      setError('Please agree to the Terms & Privacy Policy');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create account
      await authAPI.signup(email, password);
      
      // Step 2: Auto-login (instant access - no email verification gate!)
      const loginResponse = await authAPI.login(email, password);
      localStorage.setItem('access_token', loginResponse.data.access_token);
      
      // Step 3: Establish Supabase session
      const { supabase } = require('../services/supabase');
      await supabase.auth.setSession({
        access_token: loginResponse.data.access_token,
        refresh_token: loginResponse.data.refresh_token || loginResponse.data.access_token
      });
      
      // Step 4: Instant access! (Verification email sent in background)
      console.log('✅ Account created and logged in!');
      navigate('/dashboard', {
        state: {
          loginSuccess: true,
          message: '🎉 Welcome! You have 60 free minutes to get started.',
          showVerificationReminder: true
        }
      });
    } catch (err) {
      console.error('Signup error:', err);
      if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')) {
        setError('Cannot connect to server. Please make sure the backend is running.');
      } else {
        // Extract error message - handle both string and object responses
        const errorData = err.response?.data?.error || err.response?.data?.message;
        let errorMessage = 'Signup failed. Please try again.';
        if (errorData) {
          if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else if (typeof errorData === 'object' && errorData.message) {
            errorMessage = errorData.message;
          }
        } else if (err.message) {
          errorMessage = err.message;
        }
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>Get Started Free</h1>
        <p className="auth-subtitle">60 minutes free • No credit card</p>
        
        {/* Social Proof */}
        <div className="signup-social-proof">
          <div className="trust-badges">
            <span className="trust-badge">⭐⭐⭐⭐⭐ 4.8/5</span>
            <span className="trust-badge">👥 1,200+ users</span>
            <span className="trust-badge">📊 12,000+ videos</span>
          </div>
          <div className="recent-activity">
            <p className="activity-item">🟢 Sarah from NY just signed up</p>
          </div>
        </div>
        
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
            {password && (
              <div className="password-strength">
                <span style={{ color: passwordStrength.color }}>
                  {passwordStrength.strength.charAt(0).toUpperCase() + passwordStrength.strength.slice(1)}
                </span>
              </div>
            )}
            <small className="form-help">Must be at least 8 characters</small>
          </div>
          
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                disabled={loading}
              />
              I agree to <Link to="/terms">Terms & Privacy Policy</Link>
            </label>
          </div>
          
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !agreeToTerms}
            style={{ width: '100%' }}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        
        <div className="auth-divider">
          <span>──────────  OR  ──────────</span>
        </div>
        
        {/* Google Sign-In Button */}
        <GoogleSignInButton mode="signup" />
        
        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Log in</Link></p>
        </div>
      </div>
    </div>
  );
}

export default SignUpPage;

