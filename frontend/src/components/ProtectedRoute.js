import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check Supabase session first (most reliable)
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth check error:', error);
          setAuthenticated(false);
          setLoading(false);
          return;
        }

        // If we have a valid Supabase session, we're authenticated
        if (session && session.access_token) {
          // Sync with localStorage for backend API calls
          localStorage.setItem('access_token', session.access_token);
          localStorage.setItem('user', JSON.stringify(session.user));
          setAuthenticated(true);
        } else {
          // Fallback: check localStorage token
          const token = localStorage.getItem('access_token');
          if (token) {
            // Try to refresh session
            const { data: { session: refreshedSession } } = await supabase.auth.getSession();
            if (refreshedSession) {
              setAuthenticated(true);
            } else {
              // Clear invalid token
              localStorage.removeItem('access_token');
              localStorage.removeItem('user');
              setAuthenticated(false);
            }
          } else {
            setAuthenticated(false);
          }
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return authenticated ? children : <Navigate to="/login" replace />;
}

export default ProtectedRoute;

