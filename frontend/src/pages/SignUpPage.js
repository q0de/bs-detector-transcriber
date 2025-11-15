import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import './AuthPage.css';

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
      await authAPI.signup(email, password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="message message-success">
            <h2>Check your email!</h2>
            <p>We've sent a verification link to {email}</p>
            <p>Please verify your email to continue.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>Get Started Free</h1>
        <p className="auth-subtitle">60 minutes free • No credit card</p>
        
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
        
        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Log in</Link></p>
        </div>
      </div>
    </div>
  );
}

export default SignUpPage;

