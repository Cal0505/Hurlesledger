import React, { useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Shield,
  UserPlus,
  LogIn,
} from 'lucide-react';

interface AuthScreenProps {
  client: SupabaseClient | null;
  initialError?: string;
}

type Mode = 'signin' | 'signup' | 'reset';

export const AuthScreen: React.FC<AuthScreenProps> = ({ client, initialError }) => {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const resetState = () => {
    setErrorMessage('');
    setNotice('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleModeChange = (newMode: Mode) => {
    resetState();
    setMode(newMode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setNotice('');
    setIsSubmitting(true);

    try {
      if (!client) {
        setErrorMessage('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.');
        return;
      }

      if (mode === 'signup') {
        if (password.length < 6) {
          setErrorMessage('Password must be at least 6 characters.');
          return;
        }
        if (password !== confirmPassword) {
          setErrorMessage('Passwords do not match.');
          return;
        }

        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes('rate limit') || msg.includes('email rate')) {
            setErrorMessage('Too many attempts. Please try again later.');
            return;
          }
          throw error;
        }

        if (data.user?.identities?.length === 0) {
          setNotice('An account already exists for this email. Please sign in.');
          setMode('signin');
          return;
        }

        setNotice('Account created! Check your email to verify, then sign in.');
        setMode('signin');
        return;
      }

      if (mode === 'reset') {
        const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setNotice('If an account exists, a reset link has been sent to your email.');
        return;
      }

      const { error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-screen">
      <div className="auth-glow auth-glow-1" />
      <div className="auth-glow auth-glow-2" />
      
      <div className="auth-container">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <Shield size={26} />
          </div>
          <h1 className="auth-brand-name">HurlesLedger</h1>
          <p className="auth-brand-tagline">Household finances, made clear</p>
        </div>

        <div className="auth-card">
          <div className="auth-tabs">
            <button
              onClick={() => handleModeChange('signin')}
              className={`auth-tab ${mode === 'signin' ? 'auth-tab-active' : 'auth-tab-inactive'}`}
            >
              <LogIn size={16} />
              Sign In
            </button>
            <button
              onClick={() => handleModeChange('signup')}
              className={`auth-tab ${mode === 'signup' ? 'auth-tab-active' : 'auth-tab-inactive'}`}
            >
              <UserPlus size={16} />
              Create Account
            </button>
          </div>

          <div className="auth-heading">
            <h2 className="auth-title">
              {mode === 'signin' && 'Welcome back'}
              {mode === 'signup' && 'Join HurlesLedger'}
              {mode === 'reset' && 'Reset your password'}
            </h2>
            <p className="auth-subtitle">
              {mode === 'signin' && 'Sign in to manage your household finances'}
              {mode === 'signup' && 'Get started with clear, shared household budgeting'}
              {mode === 'reset' && 'Enter your email and we’ll send you a reset link'}
            </p>
          </div>

          {(initialError || (!client && !errorMessage)) && (
            <div className="auth-alert auth-alert-amber">
              <AlertCircle size={16} className="shrink-0" />
              <div>
                <p className="auth-alert-heading">Setup required</p>
                <p className="auth-alert-text">
                  Add your Supabase environment variables and restart the app.
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div role="alert" className="auth-alert auth-alert-rose">
              <AlertCircle size={16} className="shrink-0" />
              {errorMessage}
            </div>
          )}

          {notice && (
            <div role="status" className="auth-alert auth-alert-emerald">
              <CheckCircle2 size={16} className="shrink-0" />
              {notice}
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit} className="auth-form">
            <div className="auth-form-group">
              <label htmlFor="email" className="auth-label">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete={mode === 'signup' ? 'email' : 'username'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input"
                placeholder="you@example.com"
              />
            </div>

            {mode !== 'reset' && (
              <div className="auth-form-group">
                <div className="auth-label-row">
                  <label htmlFor="password" className="auth-label">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => handleModeChange('reset')}
                      className="auth-link"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="auth-input"
                  placeholder={mode === 'signup' ? 'Create a password' : 'Enter your password'}
                />
              </div>
            )}

            {mode === 'signup' && (
              <div className="auth-form-group">
                <label htmlFor="confirmPassword" className="auth-label">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="auth-input"
                  placeholder="Confirm your password"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={!client || isSubmitting}
              className="auth-button"
            >
              {isSubmitting ? (
                <span className="auth-button-loading">Please wait…</span>
              ) : (
                <>
                  {mode === 'signin' && 'Sign In'}
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'reset' && 'Send Reset Link'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {mode === 'reset' && (
            <button
              type="button"
              onClick={() => handleModeChange('signin')}
              className="auth-footer-link"
            >
              ← Back to Sign In
            </button>
          )}
        </div>

        <p className="auth-footer-text">
          Need access? Contact your workspace administrator.
        </p>
      </div>
    </main>
  );
};