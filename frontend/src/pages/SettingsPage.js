import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentAPI } from '../services/api';
import './SettingsPage.css';

function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [processingComplete, setProcessingComplete] = useState(true);
  const [usageReminder, setUsageReminder] = useState(true);
  const [billingNotifications, setBillingNotifications] = useState(true);
  const navigate = useNavigate();

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription? Your subscription will remain active until the end of the billing period.')) {
      return;
    }

    try {
      await paymentAPI.cancelSubscription();
      alert('Subscription canceled. You will retain access until the end of your billing period.');
    } catch (err) {
      alert('Failed to cancel subscription');
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await paymentAPI.createPortalSession();
      window.location.href = response.data.portal_url;
    } catch (err) {
      alert('Failed to open subscription portal');
    }
  };

  return (
    <div className="settings-page">
      <div className="container">
        <h1 className="page-title">Settings</h1>
        
        {/* Notifications */}
        <div className="settings-section">
          <h2>NOTIFICATIONS</h2>
          <div className="settings-options">
            <label>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
              />
              Email notifications
            </label>
            <label>
              <input
                type="checkbox"
                checked={processingComplete}
                onChange={(e) => setProcessingComplete(e.target.checked)}
              />
              Processing complete
            </label>
            <label>
              <input
                type="checkbox"
                checked={usageReminder}
                onChange={(e) => setUsageReminder(e.target.checked)}
              />
              Monthly usage reminder
            </label>
            <label>
              <input
                type="checkbox"
                checked={billingNotifications}
                onChange={(e) => setBillingNotifications(e.target.checked)}
              />
              Billing notifications
            </label>
          </div>
        </div>
        
        {/* Subscription */}
        <div className="settings-section">
          <h2>SUBSCRIPTION</h2>
          <div className="settings-info">
            <p>Manage your subscription, payment method, and billing preferences.</p>
            <div className="settings-actions">
              <button className="btn btn-secondary" onClick={() => navigate('/pricing')}>
                Change Plan
              </button>
              <button className="btn btn-primary" onClick={handleManageSubscription}>
                Manage Subscription →
              </button>
              <button className="btn btn-danger" onClick={handleCancelSubscription}>
                Cancel Subscription
              </button>
            </div>
          </div>
        </div>
        
        {/* Danger Zone */}
        <div className="settings-section danger-zone">
          <h2>DANGER ZONE</h2>
          <div className="settings-info">
            <p>⚠️ Delete Account</p>
            <p className="warning-text">
              This action cannot be undone. All your data will be permanently deleted.
            </p>
            <button className="btn btn-danger" onClick={() => {
              if (window.confirm('Are you sure you want to delete your account? This cannot be undone.')) {
                // TODO: Implement account deletion
                alert('Account deletion not yet implemented');
              }
            }}>
              Delete My Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;

