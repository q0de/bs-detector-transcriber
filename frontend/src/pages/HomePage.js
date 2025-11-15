import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { videoAPI } from '../services/api';
import VideoProcessor from '../components/VideoProcessor';
import './HomePage.css';

function HomePage() {
  const navigate = useNavigate();
  const [showProcessor, setShowProcessor] = useState(false);

  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <h1 className="hero-title">
            Transcribe & Analyze Videos with AI
          </h1>
          <p className="hero-subtitle">
            Paste a YouTube or Instagram link and get accurate transcription + AI-powered analysis in minutes
          </p>
          
          <VideoProcessor />
          
          <div className="hero-trust-signals">
            <span>⭐ 4.8/5 stars</span>
            <span>🆓 60 min free</span>
            <span>🌍 100+ langs</span>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title">How It Works - Simple & Fast</h2>
          <div className="steps">
            <div className="step">
              <div className="step-icon">🔗</div>
              <h3>1. Paste URL</h3>
              <p>Drop YouTube or Instagram video link</p>
            </div>
            <div className="step">
              <div className="step-icon">🤖</div>
              <h3>2. AI Process</h3>
              <p>Transcribe & analyze with AI</p>
            </div>
            <div className="step">
              <div className="step-icon">📊</div>
              <h3>3. Get Results</h3>
              <p>Review in 2-3 minutes</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <div className="container">
          <h2 className="section-title">What Makes Us Different</h2>
          <div className="features-grid">
            <div className="feature">
              <div className="feature-icon">🎯</div>
              <h3>Accurate Transcription</h3>
              <p>95%+ accuracy with Whisper AI</p>
            </div>
            <div className="feature">
              <div className="feature-icon">🧠</div>
              <h3>AI-Powered Analysis</h3>
              <p>Summaries + fact-checking</p>
            </div>
            <div className="feature">
              <div className="feature-icon">⚡</div>
              <h3>Lightning Fast</h3>
              <p>2-3 minutes per video</p>
            </div>
            <div className="feature">
              <div className="feature-icon">🔗</div>
              <h3>URL Processing</h3>
              <p>Just paste link, no downloads</p>
            </div>
            <div className="feature">
              <div className="feature-icon">📱</div>
              <h3>Multi-Platform</h3>
              <p>YouTube + Instagram</p>
            </div>
            <div className="feature">
              <div className="feature-icon">🔒</div>
              <h3>Secure</h3>
              <p>No data stored</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="pricing-preview">
        <div className="container">
          <h2 className="section-title">Pricing That Scales With You</h2>
          <div className="pricing-cards-preview">
            <div className="pricing-card-mini">
              <h3>Free</h3>
              <div className="price">$0/mo</div>
              <div className="minutes">60 min</div>
            </div>
            <div className="pricing-card-mini popular">
              <div className="badge">Most Popular</div>
              <h3>Starter</h3>
              <div className="price">$12/mo</div>
              <div className="minutes">300 min</div>
            </div>
            <div className="pricing-card-mini">
              <h3>Pro</h3>
              <div className="price">$29/mo</div>
              <div className="minutes">1000 min</div>
            </div>
            <div className="pricing-card-mini">
              <h3>Business</h3>
              <div className="price">$79/mo</div>
              <div className="minutes">3500 min</div>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/pricing')}>
            View All Plans & Features →
          </button>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <div className="container">
          <h2>Ready to Get Started?</h2>
          <p>Start analyzing videos in minutes - no credit card required</p>
          <button className="btn btn-primary" onClick={() => navigate('/signup')}>
            Get Started Free →
          </button>
          <p className="cta-note">60 minutes free • No credit card</p>
        </div>
      </section>
    </div>
  );
}

export default HomePage;

