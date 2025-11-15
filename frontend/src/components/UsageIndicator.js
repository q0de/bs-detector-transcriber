import React, { useState, useEffect } from 'react';
import { userAPI, paymentAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import './UsageIndicator.css';

function UsageIndicator() {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const response = await userAPI.getUsage();
      setUsage(response.data);
    } catch (err) {
      console.error('Failed to fetch usage:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !usage) {
    return <div className="usage-indicator loading">Loading...</div>;
  }

  const percentage = usage.percentage;
  const progressClass = percentage >= 80 ? 'danger' : percentage >= 60 ? 'warning' : '';

  return (
    <div className="usage-indicator">
      <div className="usage-header">
        <span className="tier-badge">{usage.tier.toUpperCase()} PLAN</span>
        <button
          className="upgrade-link"
          onClick={() => navigate('/pricing')}
        >
          Upgrade Plan →
        </button>
      </div>
      
      <div className="usage-stats">
        <span className="usage-text">
          {usage.used} of {usage.limit} minutes used this month
        </span>
        <span className="usage-percentage">{percentage}%</span>
      </div>
      
      <div className="progress-bar">
        <div
          className={`progress-fill ${progressClass}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      
      <div className="usage-reset">
        Resets on: {new Date(usage.reset_date).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })}
      </div>
    </div>
  );
}

export default UsageIndicator;

