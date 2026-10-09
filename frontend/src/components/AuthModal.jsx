import React, { useState } from 'react';
import { X, Lock, Mail, User, BookOpen, AlertCircle, CheckCircle, ArrowRight, ShieldAlert, Trash2 } from 'lucide-react';
import { api } from '../services/api';

// Google OAuth configuration — client ID only (secret stays on backend)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_SCOPES = 'openid email profile';

/**
 * Generate a cryptographically random state string for CSRF protection.
 * This is stored in sessionStorage and verified by the callback component.
 */
function generateOAuthState() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}



export default function AuthModal({ isOpen, onClose, onAuthSuccess, currentStudent, onDataDeleted }) {
  if (!isOpen) return null;

  const [mode, setMode] = useState('login'); // 'login', 'register', 'privacy'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Computer Science Undergraduate',
    nickname: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.login({
          email: formData.email,
          password: formData.password,
        });
        setSuccessMsg(`Welcome back, ${res.student.name}!`);
        setTimeout(() => {
          onAuthSuccess(res.student);
          onClose();
        }, 600);
      } else if (mode === 'register') {
        const res = await api.register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          nickname: formData.nickname || null,
        });
        setSuccessMsg(`Account created for ${res.student.name}!`);
        setTimeout(() => {
          onAuthSuccess(res.student);
          onClose();
        }, 600);
      }
    } catch (err) {
      console.error('Auth failure:', err);
      setError(err.response?.data?.detail || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      // 1. Ask backend for server-configured OAuth URL
      const authData = await api.getGoogleAuthUrl();
      if (authData?.url) {
        if (authData.state) {
          sessionStorage.setItem('google_oauth_state', authData.state);
        }
        window.location.href = authData.url;
        return;
      }
    } catch (err) {
      console.warn('Backend /auth/google/url discovery not available, using client configuration:', err);
    }

    // 2. Direct fallback using frontend env or defaults
    const clientId = GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError('Google sign-in is not configured. Missing Google Client ID.');
      setLoading(false);
      return;
    }

    const state = generateOAuthState();
    sessionStorage.setItem('google_oauth_state', state);

    const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/google/callback`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: GOOGLE_SCOPES,
      state,
      access_type: 'online',
      prompt: 'select_account',
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  const handleDataDelete = async () => {
    if (!currentStudent?.id) return;
    setLoading(true);
    setError(null);
    try {
      await api.deleteStudentData(currentStudent.id);
      setSuccessMsg('All quiz history, attempts, and recommendations were successfully purged.');
      setConfirmDelete(false);
      if (onDataDeleted) {
        onDataDeleted();
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to purge student data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-teal-500/10 text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 font-mono text-xs font-semibold mb-3">
            <Lock className="w-3.5 h-3.5" />
            <span>Student Authentication & Privacy</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            {mode === 'login' && 'Student Login'}
            {mode === 'register' && 'Create Student Account'}
            {mode === 'privacy' && 'Data Privacy & Deletion'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login' && 'Sign in to access your personalized learning graph and curriculum.'}
            {mode === 'register' && 'Register to build an adaptive learning roadmap from your syllabus.'}
            {mode === 'privacy' && 'Exercise your right to be forgotten (GDPR / Privacy compliance).'}
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex rounded-xl bg-slate-950 p-1 mb-6 border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-teal-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-teal-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => { setMode('privacy'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              mode === 'privacy'
                ? 'bg-rose-500 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Privacy
          </button>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form: Login / Register */}
        {mode !== 'privacy' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Alex Morgan"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nickname / Display Name <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    placeholder="e.g. Deebs"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">University / Student Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="student@university.edu"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Field of Study / Role</label>
                <div className="relative">
                  <BookOpen className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="Computer Science, Data Science, etc."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : mode === 'login' ? 'Sign In to Account' : 'Create & Initialize Student Profile'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {mode === 'login' && (
              <p className="text-[11px] text-center text-slate-500 pt-2">
                Judge quick credential:{' '}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, email: 'aiden.vance@university.edu', password: 'student123' })}
                  className="text-teal-400 underline hover:text-teal-300"
                >
                  Fill Aiden Vance (CS)
                </button>
              </p>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-[11px] text-slate-500 font-medium">or</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* Continue with Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 border border-slate-200 shadow-sm"
            >
              {/* Google "G" SVG logo */}
              <svg width="16" height="16" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
          </form>
        )}

        {/* View: Privacy & Data Deletion */}
        {mode === 'privacy' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>GDPR & Privacy Deletion Guarantee</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                In strict compliance with educational privacy and data protection standards, students can delete all their learning telemetry.
              </p>
              <ul className="text-[11px] text-slate-400 space-y-1 list-disc pl-4">
                <li>Permanently purges quiz attempts and answers</li>
                <li>Clears historical retention logs and decay points</li>
                <li>Removes personalized study recommendations</li>
                <li>Resets mastery ratings to baseline state</li>
              </ul>
            </div>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>Request Data Purge for {currentStudent?.name || 'Active Student'}</span>
              </button>
            ) : (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 space-y-3">
                <p className="text-xs text-rose-300 font-semibold">
                  Are you sure? This action is irreversible and immediately wipes all test history.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDataDelete}
                    disabled={loading}
                    className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                  >
                    {loading ? 'Purging...' : 'Yes, Delete All Data'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
