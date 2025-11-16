import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import './Navbar.css';

function Navbar() {
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in (check localStorage first for immediate update)
    const checkUser = async () => {
      const token = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');
      
      console.log('🔍 Navbar: Checking auth state');
      console.log('  - Token exists:', !!token);
      console.log('  - Stored user exists:', !!storedUser);
      
      if (token && storedUser) {
        // User is logged in - set immediately for fast UI update
        try {
          const parsedUser = JSON.parse(storedUser);
          console.log('  - ✅ Setting user from localStorage:', parsedUser.email);
          setUser(parsedUser);
        } catch (e) {
          console.error('  - ❌ Failed to parse stored user:', e);
        }
      } else {
        console.log('  - ℹ️ No token/user in localStorage');
      }
      
      // Also check with Supabase (this might be slower)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('  - ✅ Supabase confirmed user:', user.email);
        setUser(user);
      } else if (!token) {
        console.log('  - ℹ️ No Supabase user, setting to null');
        setUser(null);
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          Video Transcriber
        </Link>
        
        <div className="navbar-links">
          {user ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/history">History</Link>
              <Link to="/pricing">Pricing</Link>
              <div className="navbar-user" onClick={() => setShowDropdown(!showDropdown)}>
                <span>{user.email}</span>
                {showDropdown && (
                  <div className="navbar-dropdown">
                    <Link to="/profile" onClick={() => setShowDropdown(false)}>Profile</Link>
                    <Link to="/settings" onClick={() => setShowDropdown(false)}>Settings</Link>
                    <div className="navbar-divider"></div>
                    <button onClick={handleLogout}>Logout</button>
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

