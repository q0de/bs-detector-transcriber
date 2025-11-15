import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import './Navbar.css';

function Navbar() {
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
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

