import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import './AuthCallbackPage.css';

// Updated: 2025-11-17 - Fixed OAuth callback
function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        console.log('🔄 Starting OAuth callback handling...');
        console.log('📍 Current URL:', window.location.href);
        
        // Check if we already have a session (prevent loops)
        const { data: existingSession } = await supabase.auth.getSession();
        if (existingSession?.session) {
          console.log('✅ Session already exists, redirecting to dashboard...');
          localStorage.setItem('access_token', existingSession.session.access_token);
          localStorage.setItem('user', JSON.stringify(existingSession.session.user));
          setStatus('success');
          setTimeout(() => {
            navigate('/dashboard', { replace: true, state: { loginSuccess: true } });
          }, 100);
          return;
        }
        
        // IMPORTANT: For OAuth, we need to check the URL hash for the session
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        console.log('🔑 Hash params - access_token exists?', !!accessToken);
        console.log('🔑 Hash params - refresh_token exists?', !!refreshToken);

        if (accessToken) {
          // Immediately clear the URL hash for security/UX
          window.history.replaceState(null, '', window.location.pathname);
          
          // Set the session from hash params
          const { data: sessionData, error: setError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || accessToken,
          });

          if (setError) {
            console.error('❌ Error setting session:', setError);
            setStatus('error');
            setErrorMessage(setError.message || 'Failed to establish session');
            return;
          }

          if (sessionData.session) {
            console.log('✅ OAuth session established:', sessionData.session.user.email);
            
            // Store session in localStorage for backend API calls
            localStorage.setItem('access_token', sessionData.session.access_token);
            localStorage.setItem('user', JSON.stringify(sessionData.session.user));

            // Check if this is a new user (created_at is recent)
            const isNewUser = new Date(sessionData.session.user.created_at).getTime() > Date.now() - 10000;

            // Navigate to dashboard immediately (use replace to avoid callback URL in history)
            setStatus('success');
            console.log('✅ Navigating to dashboard...');
            setTimeout(() => {
              navigate('/dashboard', {
                replace: true, // Replace callback URL in history
                state: {
                  loginSuccess: true,
                  message: isNewUser 
                    ? `🎉 Welcome! You have 60 free minutes to get started.`
                    : `Welcome back, ${sessionData.session.user.email}!`,
                }
              });
            }, 300); // Faster redirect
            return;
          }
        }

        // Fallback: Try getting existing session
        console.log('⚠️ No access token in URL hash, trying getSession...');
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ OAuth callback error:', error);
          setStatus('error');
          setErrorMessage(error.message || 'Authentication failed');
          return;
        }

        if (data.session) {
          console.log('✅ Found existing session:', data.session.user.email);
          
          // Store session in localStorage for backend API calls
          localStorage.setItem('access_token', data.session.access_token);
          localStorage.setItem('user', JSON.stringify(data.session.user));

          // Navigate to dashboard
          setStatus('success');
          setTimeout(() => {
            navigate('/dashboard', {
              replace: true,
              state: {
                loginSuccess: true,
                message: `Welcome back, ${data.session.user.email}!`,
              }
            });
          }, 300);
        } else {
          // No session found and no hash params - redirect to login
          console.error('❌ No session found and no OAuth data in URL');
          setStatus('error');
          setErrorMessage('No session found. Please try signing in again.');
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 2000);
        }
      } catch (err) {
        console.error('❌ Unexpected error in OAuth callback:', err);
        setStatus('error');
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    };

    handleOAuthCallback();
  }, [navigate]);

  return (
    <div className="auth-callback-page">
      <div className="auth-callback-container">
        {status === 'processing' && (
          <>
            <div className="callback-spinner"></div>
            <h2>Completing sign-in...</h2>
            <p>Please wait while we set up your account.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="callback-success">✓</div>
            <h2>Success!</h2>
            <p>Redirecting to dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="callback-error">✗</div>
            <h2>Authentication Failed</h2>
            <p>{errorMessage}</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/login')}
              style={{ marginTop: '20px' }}
            >
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default AuthCallbackPage;

