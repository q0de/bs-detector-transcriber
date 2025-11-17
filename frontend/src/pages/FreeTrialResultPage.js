import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import './FreeTrialResultPage.css';

function FreeTrialResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');
  
  const videoResult = location.state?.videoResult;
  const originalUrl = location.state?.originalUrl;

  useEffect(() => {
    if (!videoResult) {
      navigate('/');
    }
  }, [videoResult, navigate]);

  const handleQuickSignup = async (e) => {
    e.preventDefault();
    setSignupLoading(true);
    setSignupError('');
    
    try {
      const { authAPI } = require('../services/api');
      await authAPI.signup(signupEmail, signupPassword);
      
      // Auto-login after signup
      const loginResponse = await authAPI.login(signupEmail, signupPassword);
      localStorage.setItem('access_token', loginResponse.data.access_token);
      
      // Redirect to dashboard
      navigate('/dashboard', {
        state: {
          loginSuccess: true,
          message: 'Account created! Enjoy your 60 free minutes.'
        }
      });
    } catch (err) {
      setSignupError(err.response?.data?.error || 'Failed to create account');
    } finally {
      setSignupLoading(false);
    }
  };

  if (!videoResult) return null;

  return (
    <div className="free-trial-result-page">
      <div className="container">
        {/* Celebration header */}
        <div className="free-trial-header">
          <div className="celebration-icon">🎉</div>
          <h1>Your Free Analysis is Ready!</h1>
          <p className="subtitle">Here's what we found in your video</p>
        </div>

        {/* Video info card */}
        {videoResult.metadata && (
          <div className="video-info-card">
            {videoResult.metadata.thumbnail && (
              <img 
                src={videoResult.metadata.thumbnail} 
                alt="Video thumbnail"
                className="video-thumbnail"
              />
            )}
            <div className="video-details">
              <h2>{videoResult.title || videoResult.metadata.title || 'Video Analysis'}</h2>
              {videoResult.metadata.author && (
                <p className="video-author">👤 {videoResult.metadata.author}</p>
              )}
              <p className="video-meta">
                📹 {videoResult.platform || 'YouTube'} • 
                ⏱️ {videoResult.duration_minutes?.toFixed(1)} min
              </p>
            </div>
          </div>
        )}

        {/* Analysis results */}
        <div className="analysis-results">
          <h3>📊 Summary:</h3>
          <div className="analysis-content">
            {videoResult.analysis}
          </div>
        </div>

        {/* Signup prompt with social proof */}
        <div className="signup-prompt-card">
          <div className="prompt-header">
            <h2>💡 Want to unlock more?</h2>
            <p>Sign up FREE to get:</p>
          </div>
          
          <div className="features-grid">
            <div className="feature-item">
              <span className="feature-icon">✅</span>
              <div className="feature-text">
                <strong>Fact-Checking</strong>
                <p>Verify every claim with sources</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">💾</span>
              <div className="feature-text">
                <strong>Save Results</strong>
                <p>Access your analyses anytime</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📈</span>
              <div className="feature-text">
                <strong>60 Free Minutes</strong>
                <p>Analyze more videos each month</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎯</span>
              <div className="feature-text">
                <strong>Bias Analysis</strong>
                <p>Understand content perspective</p>
              </div>
            </div>
          </div>

          {/* Social proof */}
          <div className="social-proof">
            <div className="trust-signals">
              <span className="trust-badge">⭐⭐⭐⭐⭐ 4.8/5</span>
              <span className="trust-badge">👥 1,200+ users</span>
              <span className="trust-badge">📊 12,000+ videos analyzed</span>
            </div>
          </div>

          {/* Quick signup form */}
          <form onSubmit={handleQuickSignup} className="quick-signup-form">
            <h3>Get Started in 10 Seconds</h3>
            
            {signupError && (
              <div className="message message-error">{signupError}</div>
            )}
            
            <div className="form-row">
              <input
                type="email"
                placeholder="Your email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                required
                disabled={signupLoading}
                className="form-input"
              />
              <input
                type="password"
                placeholder="Choose password (8+ chars)"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                required
                minLength="8"
                disabled={signupLoading}
                className="form-input"
              />
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary btn-large"
              disabled={signupLoading}
            >
              {signupLoading ? 'Creating Account...' : '🚀 Claim 60 Free Minutes'}
            </button>
            
            <p className="signup-note">
              No credit card • Free forever plan available
            </p>
          </form>

          <div className="alternative-actions">
            <p>Already have an account? <Link to="/login">Log in</Link></p>
            <button 
              className="btn btn-text"
              onClick={() => navigate('/')}
            >
              ← Try another video
            </button>
          </div>
        </div>

        {/* Testimonials */}
        <div className="testimonials-section">
          <h3>What Users Say</h3>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-stars">⭐⭐⭐⭐⭐</div>
              <p>"This tool helped me verify news claims in seconds. Essential!"</p>
              <div className="testimonial-author">— Sarah M., Journalist</div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-stars">⭐⭐⭐⭐⭐</div>
              <p>"Love the fact-checking feature. Saves me hours of research."</p>
              <div className="testimonial-author">— Mike T., Researcher</div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-stars">⭐⭐⭐⭐⭐</div>
              <p>"Finally, a tool that shows bias and verifies claims. Game changer!"</p>
              <div className="testimonial-author">— Emma L., Teacher</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FreeTrialResultPage;

