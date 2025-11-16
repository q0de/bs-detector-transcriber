import React, { useState, useEffect } from 'react';
import { userAPI, paymentAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import ReferralDashboard from '../components/ReferralDashboard';
import './ProfilePage.css';

function ProfilePage() {
  const [user, setUser] = useState(null);
  const [usage, setUsage] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [userRes, usageRes, invoicesRes] = await Promise.all([
        userAPI.getCurrentUser(),
        userAPI.getUsage(),
        paymentAPI.getBillingHistory().catch(() => ({ data: { invoices: [] } }))
      ]);
      
      setUser(userRes.data);
      setUsage(usageRes.data);
      setInvoices(invoicesRes.data.invoices || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await paymentAPI.createPortalSession();
      window.location.href = response.data.portal_url;
    } catch (err) {
      console.error('Failed to open subscription portal:', err);
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="container">
          <div className="loading-state">
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="container">
        <h1 className="page-title">Your Profile</h1>
        
        {/* Account Section */}
        <div className="profile-section">
          <h2>ACCOUNT</h2>
          <div className="profile-info">
            <div className="info-item">
              <label>Email:</label>
              <span>{user?.email}</span>
            </div>
            <div className="info-item">
              <label>Member since:</label>
              <span>{new Date(user?.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="profile-actions">
              <button className="btn btn-secondary">Change Password</button>
              <button className="btn btn-danger">Delete Account</button>
            </div>
          </div>
        </div>
        
        {/* Subscription Section */}
        <div className="profile-section">
          <h2>SUBSCRIPTION</h2>
          <div className="profile-info">
            <div className="info-item">
              <label>Current Plan:</label>
              <span className="tier-badge">{user?.subscription_tier?.toUpperCase() || 'FREE'}</span>
            </div>
            <div className="info-item">
              <label>Status:</label>
              <span>{user?.subscription_status || 'active'}</span>
            </div>
            <div className="profile-actions">
              <button className="btn btn-secondary" onClick={() => navigate('/pricing')}>
                Change Plan
              </button>
              <button className="btn btn-primary" onClick={handleManageSubscription}>
                Manage Subscription
              </button>
            </div>
          </div>
        </div>
        
        {/* Usage Section */}
        {usage && (
          <div className="profile-section">
            <h2>USAGE</h2>
            <div className="profile-info">
              <div className="info-item">
                <label>This month:</label>
                <span>{usage.used} / {usage.limit} minutes ({usage.percentage}%)</span>
              </div>
              <div className="info-item">
                <label>Resets on:</label>
                <span>{new Date(usage.reset_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
        )}

        {/* Referral Section */}
        <div className="profile-section">
          <ReferralDashboard />
        </div>
        
        {/* Billing History */}
        {invoices.length > 0 && (
          <div className="profile-section">
            <h2>BILLING HISTORY</h2>
            <div className="invoices-list">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="invoice-item">
                  <div className="invoice-date">{new Date(invoice.date).toLocaleDateString()}</div>
                  <div className="invoice-amount">${(invoice.amount / 100).toFixed(2)}</div>
                  <div className="invoice-status">{invoice.status}</div>
                  {invoice.invoice_pdf && (
                    <a href={invoice.invoice_pdf} target="_blank" rel="noopener noreferrer" className="invoice-link">
                      Invoice ↓
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;

