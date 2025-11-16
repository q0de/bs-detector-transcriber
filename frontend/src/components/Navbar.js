import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { userAPI } from '../services/api';
import './Navbar.css';

function Navbar() {
  const [user, setUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in (check localStorage first for immediate update)
    const checkUser = async () => {
      const token = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');
      
      if (token && storedUser) {
        // User is logged in - set immediately for fast UI update
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          
          // Fetch full user details including subscription
          try {
            const response = await userAPI.getCurrentUser();
            setUserDetails(response.data);
          } catch (err) {
            console.error('Failed to fetch user details:', err);
          }
        } catch (e) {
          console.error('Failed to parse stored user:', e);
        }
      }
      
      // Also check with Supabase (this might be slower)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        // Fetch details for this user too
        try {
          const response = await userAPI.getCurrentUser();
          setUserDetails(response.data);
        } catch (err) {
          console.error('Failed to fetch user details:', err);
        }
      } else if (!token) {
        setUser(null);
        setUserDetails(null);
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Refetch user details on auth change
        userAPI.getCurrentUser().then(res => setUserDetails(res.data)).catch(console.error);
      } else {
        setUserDetails(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const getTierBadgeColor = (tier) => {
    const colors = {
      'free': '#95a5a6',
      'starter': '#667eea',
      'pro': '#4CAF50',
      'business': '#FF9800'
    };
    return colors[tier?.toLowerCase()] || '#95a5a6';
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">🔍</span>
          TruthLens
        </Link>
        
        <div className="navbar-links">
          {user ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/history">History</Link>
              <Link to="/pricing">Pricing</Link>
              <div className="navbar-user" onClick={() => setShowDropdown(!showDropdown)}>
                <div className="user-avatar">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="user-info-preview">
                  <span className="user-email">{user.email?.split('@')[0]}</span>
                  {userDetails?.subscription_tier && (
                    <span 
                      className="user-tier-badge"
                      style={{ backgroundColor: getTierBadgeColor(userDetails.subscription_tier) }}
                    >
                      {userDetails.subscription_tier.toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="dropdown-arrow">▾</span>
                {showDropdown && (
                  <div className="navbar-dropdown">
                    <div className="dropdown-header">
                      <div className="dropdown-user-info">
                        <strong>{user.email}</strong>
                        {userDetails && (
                          <>
                            <span className="dropdown-tier">
                              {userDetails.subscription_tier?.toUpperCase() || 'FREE'} Plan
                            </span>
                            <span className="dropdown-minutes">
                              {userDetails.minutes_remaining || 0} / {userDetails.minutes_limit || 0} min
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="navbar-divider"></div>
                    <Link to="/profile" onClick={() => setShowDropdown(false)}>
                      👤 Profile & Billing
                    </Link>
                    <Link to="/profile#referrals" onClick={() => setShowDropdown(false)}>
                      🎁 Referral Program
                    </Link>
                    <Link to="/pricing" onClick={() => setShowDropdown(false)}>
                      ⚡ Upgrade Plan
                    </Link>
                    <div className="navbar-divider"></div>
                    <button onClick={handleLogout}>🚪 Logout</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/pricing">Pricing</Link>
              <Link to="/login">Login</Link>
              <Link to="/signup" className="btn btn-primary">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

