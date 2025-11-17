import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { userAPI } from '../services/api';
import './Navbar.css';

function Navbar() {
  const [user, setUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // DEBUG: Log current user state on every render
  console.log('🔄 Navbar render - user:', user?.email || 'null', 'userDetails:', userDetails?.subscription_tier || 'null');

  useEffect(() => {
    // Check if user is logged in - run on EVERY page load
    const checkUser = async () => {
      console.log('🚀 Navbar useEffect - starting auth check...');
      console.log('📍 Current page:', window.location.pathname);
      
      // First, try to get session from Supabase
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('🔍 Navbar checking auth - Supabase session:', session?.user?.email || 'none');
      if (error) {
        console.error('❌ Supabase session error:', error);
      }
      
      if (session?.user) {
        console.log('✅ Found Supabase session');
        setUser(session.user);
        // Fetch full user details
        try {
          const response = await userAPI.getCurrentUser();
          setUserDetails(response.data);
        } catch (err) {
          console.error('Failed to fetch user details:', err);
        }
      } else {
        // Fallback to localStorage
        const token = localStorage.getItem('access_token');
        const storedUser = localStorage.getItem('user');
        console.log('🔍 Checking localStorage - token:', token ? 'exists' : 'missing', 'user:', storedUser ? 'exists' : 'missing');
        
        if (token && storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            console.log('✅ Found localStorage user:', parsedUser.email);
            setUser(parsedUser);
            // Fetch user details
            try {
              const response = await userAPI.getCurrentUser();
              setUserDetails(response.data);
            } catch (err) {
              console.error('Failed to fetch user details:', err);
            }
          } catch (e) {
            console.error('❌ Failed to parse stored user:', e);
            // Clear invalid data
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            setUser(null);
            setUserDetails(null);
          }
        } else {
          console.log('❌ No authentication found');
          setUser(null);
          setUserDetails(null);
        }
      }
    };

    checkUser();

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      // Only update state for actual auth events, not INITIAL_SESSION with no session
      if (event !== 'INITIAL_SESSION' || session?.user) {
        setUser(session?.user ?? null);
        if (session?.user) {
          // Refetch user details on auth change
          userAPI.getCurrentUser()
            .then(res => setUserDetails(res.data))
            .catch(console.error);
        } else if (event === 'SIGNED_OUT') {
          // Only clear on explicit sign out
          setUserDetails(null);
        }
      }
      // If INITIAL_SESSION with no session, keep existing state (from localStorage)
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
                      {userDetails.subscription_tier}
                    </span>
                  )}
                </div>
                <span className="dropdown-arrow">▼</span>
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
              {/* Context-aware CTA: Show "Sign Up" on homepage, "Try Free" elsewhere */}
              {location.pathname === '/' ? (
                <>
                  <Link to="/login" className="login-link">Login</Link>
                  <Link to="/signup" className="btn btn-primary">Sign Up Free</Link>
                </>
              ) : (
                <>
                  <Link to="/login" className="login-link">Login</Link>
                  <Link to="/" className="btn btn-primary">Try Free →</Link>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

