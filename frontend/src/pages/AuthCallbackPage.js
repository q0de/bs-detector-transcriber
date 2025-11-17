import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import './AuthCallbackPage.css';

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('OAuth callback error:', error);
          setStatus('error');
          setErrorMessage(error.message || 'Authentication failed');
          return;
        }

        if (data.session) {
          console.log('✅ OAuth session established:', data.session.user.email);
          
          // Store session in localStorage for backend API calls
          localStorage.setItem('access_token', data.session.access_token);
          localStorage.setItem('user', JSON.stringify(data.session.user));

          // Check if this is a new user (created_at is recent)
          const isNewUser = new Date(data.session.user.created_at).getTime() > Date.now() - 5000;

          // Navigate to dashboard with success message
          setStatus('success');
          setTimeout(() => {
            navigate('/dashboard', {
              state: {
                loginSuccess: true,
                message: isNewUser 
                  ? `🎉 Welcome! You have 60 free minutes to get started.`
                  : `Welcome back, ${data.session.user.email}!`,
              }
            });
          }, 1000);
        } else {
          // No session found - might be an error
          setStatus('error');
          setErrorMessage('No session found. Please try signing in again.');
        }
      } catch (err) {
        console.error('Unexpected error in OAuth callback:', err);
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

