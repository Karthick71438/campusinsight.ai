/**
 * GoogleAuthCallback.jsx
 * ======================
 * Handles the Google OAuth redirect callback.
 *
 * Flow:
 *   1. Google redirects to http://localhost:5173/auth/google/callback?code=...&state=...
 *   2. This component reads code + state from the URL.
 *   3. Verifies the state matches what was stored in sessionStorage (CSRF protection).
 *   4. Sends the code to the backend via api.googleAuthCode().
 *   5. Calls onAuthSuccess() to establish the application session.
 *   6. Redirects the user to the dashboard.
 *
 * Error cases handled:
 *   - User cancelled Google consent (error=access_denied)
 *   - State mismatch (CSRF attempt)
 *   - Backend exchange failure
 *   - Network failure
 *   - Missing code
 */

import React, { useEffect, useState } from 'react';
import { Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../services/api';

const getRedirectUri = () => {
  return import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/google/callback`;
};

export default function GoogleAuthCallback({ onAuthSuccess, onCancel }) {
  const [status, setStatus] = useState('processing'); // 'processing' | 'success' | 'error'
  const [message, setMessage] = useState('Completing Google sign-in...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const studentId = params.get('student_id');
    const name = params.get('name');
    const email = params.get('email');
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    // Handle user cancellation or OAuth error
    if (error) {
      if (error === 'access_denied') {
        setStatus('error');
        setMessage('Google sign-in was cancelled. You can return and use email/password login instead.');
      } else {
        setStatus('error');
        setMessage(`Google authentication error: ${errorDescription || error}. Please try again.`);
      }
      return;
    }

    // Case 1: Backend callback redirected here with session token already established
    if (token) {
      localStorage.setItem('learnGraph_token', token);
      if (studentId) localStorage.setItem('learnGraph_student_id', studentId);
      if (name) localStorage.setItem('learnGraph_display_name', name);

      setStatus('success');
      setMessage(`Welcome, ${name || 'Student'}! Redirecting to your dashboard...`);

      const resolveStudent = async () => {
        try {
          const student = await api.getMe();
          setTimeout(() => {
            if (onAuthSuccess) onAuthSuccess(student);
            window.history.replaceState({}, '', '/');
          }, 600);
        } catch {
          setTimeout(() => {
            if (onAuthSuccess) onAuthSuccess({ id: studentId, name, email, role: 'Student' });
            window.history.replaceState({}, '', '/');
          }, 600);
        }
      };
      resolveStudent();
      return;
    }

    // Case 2: Frontend callback with authorization code
    if (code) {
      // CSRF state verification
      const storedState = sessionStorage.getItem('google_oauth_state');
      if (storedState && state && state !== storedState) {
        setStatus('error');
        setMessage('Security check failed: OAuth state mismatch. Please try signing in again.');
        return;
      }
      sessionStorage.removeItem('google_oauth_state');

      const exchangeCode = async () => {
        try {
          const res = await api.googleAuthCode({
            code,
            redirect_uri: getRedirectUri(),
            state,
          });

          setStatus('success');
          setMessage(`Welcome, ${res.student?.name || 'Student'}! Redirecting to your dashboard...`);

          setTimeout(() => {
            if (onAuthSuccess) onAuthSuccess(res.student);
            window.history.replaceState({}, '', '/');
          }, 600);
        } catch (err) {
          console.error('Google auth exchange failed:', err);
          let userMessage = 'Google sign-in failed. Please try again.';
          const detail = err?.response?.data?.detail;
          if (detail) {
            if (detail.includes('not configured')) {
              userMessage = 'Google sign-in is not yet configured on this server. Please set GOOGLE_CLIENT_SECRET in backend/.env.';
            } else if (detail.includes('already used') || detail.includes('invalid_grant')) {
              userMessage = 'This sign-in link has expired. Please click "Continue with Google" again.';
            } else if (detail.includes('redirect_uri_mismatch')) {
              userMessage = 'OAuth redirect URI mismatch. Please verify Authorized redirect URIs in Google Cloud Console.';
            } else {
              userMessage = detail;
            }
          } else if (!navigator.onLine) {
            userMessage = 'Network connection lost. Please check your internet connection and try again.';
          }
          setStatus('error');
          setMessage(userMessage);
        }
      };
      exchangeCode();
      return;
    }

    // Case 3: Neither token nor code present
    setStatus('error');
    setMessage('No authorization response received from Google. Please try signing in again.');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-teal-500/10 text-slate-100 text-center">

        {status === 'processing' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mx-auto mb-5 animate-spin">
              <Sparkles className="w-7 h-7 text-teal-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-100 mb-2">Completing Google Sign-In</h2>
            <p className="text-xs text-slate-400">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-7 h-7 text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-100 mb-2">Signed In!</h2>
            <p className="text-xs text-slate-400">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-7 h-7 text-rose-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-100 mb-2">Sign-In Failed</h2>
            <p className="text-xs text-slate-400 mb-6">{message}</p>
            <button
              onClick={() => {
                window.history.replaceState({}, '', '/');
                if (onCancel) onCancel();
              }}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
            >
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
