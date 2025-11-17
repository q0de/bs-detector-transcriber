import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { userAPI } from '../services/api';
import AuthModal from './AuthModal';
import './Navbar.css';

function Navbar() {
  const [user, setUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [navbarVariant, setNavbarVariant] = useState(() => {
    // Load from localStorage or default to 'option1'
    return localStorage.getItem('navbarVariant') || 'option1';
  });
  const navigate = useNavigate();
  const location = useLocation();
  
  // Save variant to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('navbarVariant', navbarVariant);
  }, [navbarVariant]);

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
              
              {/* OPTION 1: Single Primary CTA - No Login in Navbar */}
              {navbarVariant === 'option1' && (
                location.pathname === '/' ? (
                  <Link to="/signup" className="btn btn-primary">Sign Up Free</Link>
                ) : (
                  <Link to="/" className="btn btn-primary">Try Free →</Link>
                )
              )}
              
              {/* OPTION 3: Context-Aware Single Button */}
              {navbarVariant === 'option3' && (
                location.pathname === '/' ? (
                  <Link to="/signup" className="btn btn-primary">Sign Up Free</Link>
                ) : (
                  <Link to="/" className="btn btn-primary">Try Free →</Link>
                )
              )}
              
              {/* OPTION 5: Get Started Button (opens modal) */}
              {navbarVariant === 'option5' && (
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowAuthModal(true)}
                >
                  Get Started
                </button>
              )}
              
              {/* Variant Selector (Demo Mode) */}
              <div className="navbar-variant-selector">
                <select 
                  value={navbarVariant} 
                  onChange={(e) => setNavbarVariant(e.target.value)}
                  className="variant-select"
                  title="Switch navbar UX variants"
                >
                  <option value="option1">Option 1: Single CTA</option>
                  <option value="option3">Option 3: Context-Aware</option>
                  <option value="option5">Option 5: Get Started</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>
      {/* Auth Modal for Option 5 */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </nav>
  );
}

export default Navbar;

