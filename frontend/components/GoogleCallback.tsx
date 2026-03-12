import React, { useEffect, useState } from 'react';
import { LoadingScreen } from './LoadingScreen';

interface GoogleCallbackProps {
  onSuccess: (token: string, userId: number) => void;
  onError: (error: string) => void;
}

export const GoogleCallback: React.FC<GoogleCallbackProps> = ({ onSuccess, onError }) => {
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      // Check for errors from Google
      if (error) {
        setStatus('error');
        setErrorMessage(`Google OAuth error: ${error}`);
        onError(error);
        return;
      }

      // Verify state (CSRF protection)
      const savedState = sessionStorage.getItem('oauth_state');
      if (state !== savedState) {
        setStatus('error');
        setErrorMessage('Invalid state parameter');
        onError('Invalid state parameter');
        return;
      }

      // Clear state
      sessionStorage.removeItem('oauth_state');

      if (!code) {
        setStatus('error');
        setErrorMessage('No authorization code received');
        onError('No authorization code received');
        return;
      }

      try {
        // Exchange code for tokens via backend
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
        const response = await fetch(`${API_BASE_URL}/auth/google/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: code,
            redirect_uri: `${window.location.origin}/auth/google/callback`
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Authentication failed' }));
          throw new Error(errorData.error || 'Authentication failed');
        }

        const data = await response.json();
        
        // Store tokens
        if (data.access_token) {
          localStorage.setItem('authToken', data.access_token);
          if (data.refresh_token) {
            localStorage.setItem('refreshToken', data.refresh_token);
          }
          if (data.username) {
            localStorage.setItem('username', data.username);
          }
          
          onSuccess(data.access_token, data.user_id);
        } else {
          throw new Error('No token received from server');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Authentication failed';
        setStatus('error');
        setErrorMessage(message);
        onError(message);
      }
    };

    handleCallback();
  }, [onSuccess, onError]);

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Ошибка авторизации</h1>
        <p className="text-gray-500 text-center mb-6">{errorMessage}</p>
        <button
          onClick={() => window.location.href = '/app.html'}
          className="bg-[#E95D2C] text-white px-8 py-3 rounded-full font-semibold hover:bg-[#c94d20] transition-colors"
        >
          Вернуться к входу
        </button>
      </div>
    );
  }

  return <LoadingScreen />;
};

