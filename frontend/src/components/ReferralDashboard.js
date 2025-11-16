import React, { useState, useEffect } from 'react';
import { referralAPI } from '../services/api';
import './ReferralDashboard.css';

function ReferralDashboard() {
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [referralUrl, setReferralUrl] = useState('');
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      const [codeResponse, statsResponse] = await Promise.all([
        referralAPI.getCode(),
        referralAPI.getStats()
      ]);

      setReferralCode(codeResponse.data.referral_code);
      setReferralUrl(codeResponse.data.referral_url);
      setStats(statsResponse.data);
    } catch (err) {
      console.error('Failed to fetch referral data:', err);
      setError('Failed to load referral information');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="referral-dashboard">
        <div className="loading">Loading referral data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="referral-dashboard">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="referral-dashboard">
      <div className="referral-header">
        <h2>🎁 Refer & Earn</h2>
        <p>Invite friends and get <strong>300 free minutes</strong> when they subscribe!</p>
      </div>

      <div className="referral-card">
        <h3>Your Referral Code</h3>
        <div className="code-display">
          <input
            type="text"
            value={referralCode}
            readOnly
            className="code-input"
          />
          <button
            className={`copy-btn ${copied ? 'copied' : ''}`}
            onClick={() => copyToClipboard(referralCode)}
          >
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
      </div>

      <div className="referral-card">
        <h3>Your Referral Link</h3>
        <div className="link-display">
          <input
            type="text"
            value={referralUrl}
            readOnly
            className="link-input"
          />
          <button
            className="copy-btn"
            onClick={() => copyToClipboard(referralUrl)}
          >
            📋 Copy Link
          </button>
        </div>
      </div>

      <div className="referral-stats">
        <div className="stat-card">
          <div className="stat-value">{stats.total_referrals}</div>
          <div className="stat-label">Total Referrals</div>
        </div>
        <div className="stat-card success">
          <div className="stat-value">{stats.completed_referrals}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card pending">
          <div className="stat-value">{stats.pending_referrals}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card bonus">
          <div className="stat-value">{stats.bonus_minutes_earned}</div>
          <div className="stat-label">Bonus Minutes</div>
        </div>
      </div>

      <div className="referral-how-it-works">
        <h3>How It Works</h3>
        <ol>
          <li>Share your referral code or link with friends</li>
          <li>They sign up and subscribe to any paid plan</li>
          <li>You both get <strong>300 bonus minutes</strong> (1 month free!)</li>
          <li>Unlimited referrals = Unlimited bonus minutes!</li>
        </ol>
      </div>

      {stats.referrals && stats.referrals.length > 0 && (
        <div className="referral-list">
          <h3>Recent Referrals</h3>
          <div className="referrals-table">
            {stats.referrals.slice(0, 5).map((referral) => (
              <div key={referral.id} className="referral-item">
                <div className="referral-status">
                  <span className={`status-badge ${referral.status}`}>
                    {referral.status}
                  </span>
                </div>
                <div className="referral-date">
                  {new Date(referral.created_at).toLocaleDateString()}
                </div>
                <div className="referral-reward">
                  +{referral.reward_minutes} min
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ReferralDashboard;

