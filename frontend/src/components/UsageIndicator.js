import React, { useState, useEffect } from 'react';
import { userAPI, paymentAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import './UsageIndicator.css';

function UsageIndicator() {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsage();
    
    // Listen for custom event when video is processed
    const handleUsageUpdate = () => {
      fetchUsage();
    };
    
    window.addEventListener('usageUpdated', handleUsageUpdate);
    
    // Cleanup event listener on unmount
    return () => window.removeEventListener('usageUpdated', handleUsageUpdate);
  }, []);

  const fetchUsage = async () => {
    try {
      // Only show updating state if not initial load
      if (!loading) {
        setUpdating(true);
      }
      
      const response = await userAPI.getUsage();
      setUsage(response.data);
      setLoading(false);
      
      // Brief delay to show update animation
      setTimeout(() => setUpdating(false), 300);
    } catch (err) {
      console.error('Failed to fetch usage:', err);
      setLoading(false);
      setUpdating(false);
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

