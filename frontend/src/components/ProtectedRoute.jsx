import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Spinner } from "@heroui/react";
import { supabase } from "../services/supabase";

export default function ProtectedRoute({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth check error:', error);
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        if (session && session.access_token) {
          localStorage.setItem('access_token', session.access_token);
          localStorage.setItem('user', JSON.stringify(session.user));
          setIsAuthenticated(true);
        } else {
          const token = localStorage.getItem('access_token');
          if (token) {
            const { data: { session: refreshedSession } } = await supabase.auth.getSession();
            if (refreshedSession) {
              setIsAuthenticated(true);
            } else {
              localStorage.removeItem('access_token');
              localStorage.removeItem('user');
              setIsAuthenticated(false);
            }
          } else {
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

