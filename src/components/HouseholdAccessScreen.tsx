import React, { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Check, CheckCircle2, Clock3, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { HOUSEHOLD_MEMBER_COLORS } from '../constants/memberColors';

interface HouseholdAccessScreenProps {
  client: SupabaseClient;
  email: string;
  status: 'profile' | 'pending' | 'denied' | 'none';
  onRefresh: () => void;
  onSignOut: () => Promise<void>;
}

export const HouseholdAccessScreen: React.FC<HouseholdAccessScreenProps> = ({
  client,
  email,
  status,
  onRefresh,
  onSignOut,
}) => {
  const [memberName, setMemberName] = useState('');
  const [avatarColor, setAvatarColor] = useState(HOUSEHOLD_MEMBER_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRequest = async () => {
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const { submitHouseholdAccessRequest } = await import('../utils/database');
      await submitHouseholdAccessRequest(client);
      onRefresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to submit your access request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const { createApprovedHouseholdMemberProfile } = await import('../utils/database');
      await createApprovedHouseholdMemberProfile(client, memberName, avatarColor);
      onRefresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create your household profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="access-screen">
      <div className="access-glow access-glow-1" />
      <div className="access-glow access-glow-2" />

      <div className="access-container">
        <div className="access-icon-wrap">
          <div className="access-icon">
            {status === 'pending' ? <Clock3 size={28} /> : <UserRound size={28} />}
          </div>
        </div>

        <div className="access-card">
          <h1 className="access-title">
            {status === 'pending'
              ? 'Request awaiting approval'
              : status === 'profile'
                ? 'Create your household profile'
                : 'Request household access'}
          </h1>

          <p className="access-subtitle">
            Signed in as <strong>{email}</strong>.
            {status === 'pending'
              ? ' An authorized household user needs to approve your access request.'
              : status === 'denied'
                ? ' Your previous request was not approved. You can submit a new request for household access.'
                : status === 'profile'
                  ? ' Your household access has been approved. Create your profile to finish setting up your account.'
                  : ' Request access to the household. Once an authorized user approves you, you can create your household profile.'}
          </p>

          {status === 'pending' && (
            <div className="access-pending-box">
              <div className="access-pending-header">
                <CheckCircle2 size={16} />
                Request submitted
              </div>
              <p className="access-pending-text">
                An authorized household user must approve your access before you can create your profile.
              </p>
              <button
                type="button"
                onClick={onRefresh}
                className="access-check-btn"
              >
                Check approval status
              </button>
            </div>
          )}

          {status === 'profile' && (
            <form onSubmit={handleCreateProfile} className="access-form">
              <div>
                <label htmlFor="access-member-name" className="access-label">
                  Your name
                </label>
                <div className="access-input-wrapper">
                  <UserRound className="access-input-icon" />
                  <input
                    id="access-member-name"
                    type="text"
                    autoComplete="name"
                    value={memberName}
                    onChange={(event) => setMemberName(event.target.value)}
                    required
                    maxLength={80}
                    className="access-input"
                    placeholder="Enter your name"
                  />
                </div>
                <p className="access-input-note">
                  Your login email will be saved with your household profile.
                </p>
              </div>

              <div>
                <span className="access-label">Avatar color</span>
                <div className="access-color-picker">
                  {HOUSEHOLD_MEMBER_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAvatarColor(color)}
                      aria-label={`Choose avatar color ${color}`}
                      aria-pressed={avatarColor === color}
                      className={`access-color-btn ${avatarColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color } as React.CSSProperties}
                    >
                      {avatarColor === color && <Check size={16} />}
                    </button>
                  ))}
                </div>
              </div>

              {errorMessage && (
                <p role="alert" className="access-error-text">{errorMessage}</p>
              )}

              <button
                type="submit"
                disabled={!memberName.trim() || isSubmitting}
                className="access-btn-primary"
              >
                <ShieldCheck size={16} />
                {isSubmitting ? 'Saving profile…' : 'Create household profile'}
              </button>
            </form>
          )}

          {(status === 'denied' || status === 'none') && (
            <div>
              {errorMessage && (
                <p role="alert" className="access-error-text">{errorMessage}</p>
              )}
              <button
                type="button"
                onClick={() => void handleRequest()}
                disabled={isSubmitting}
                className="access-btn-primary"
              >
                <ShieldCheck size={16} />
                {isSubmitting ? 'Sending request…' : status === 'denied' ? 'Resubmit access request' : 'Request access'}
              </button>
            </div>
          )}

          {errorMessage && status === 'pending' && (
            <p role="alert" className="access-error-text access-error-spacing">
              {errorMessage}
            </p>
          )}

          <button
            type="button"
            onClick={() => void onSignOut()}
            className="access-sign-out-btn"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>
    </main>
  );
};