import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('=== PROTECTED ROUTE: Checking auth ===');
        const token = localStorage.getItem('access_token');
        console.log('Token exists:', !!token);
        
        // If we have a token in localStorage, we're authenticated
        if (token) {
          console.log('✅ User is authenticated');
          setAuthenticated(true);
        } else {
          console.log('❌ No token found');
          setAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  console.log('ProtectedRoute state - loading:', loading, 'authenticated:', authenticated);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!authenticated) {
    console.log('=== REDIRECTING TO LOGIN (not authenticated) ===');
  } else {
    console.log('=== SHOWING PROTECTED CONTENT ===');
  }

  return authenticated ? children : <Navigate to="/login" replace />;
}

export default ProtectedRoute;

