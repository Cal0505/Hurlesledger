import React, { useState, useEffect } from 'react';
import { X, Users, AlertCircle, Check } from 'lucide-react';
import { Member } from '../types/budget';
import { HOUSEHOLD_MEMBER_COLORS } from '../constants/memberColors';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveMember: (memberData: Omit<Member, 'id' | 'createdAt'>, memberId?: string) => void;
  memberToEdit?: Member | null;
}

export const MemberModal: React.FC<MemberModalProps> = ({
  isOpen,
  onClose,
  onSaveMember,
  memberToEdit,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [authUserId, setAuthUserId] = useState('');
  const [avatarColor, setAvatarColor] = useState(HOUSEHOLD_MEMBER_COLORS[0]);
  const [isAccountHolder, setIsAccountHolder] = useState(false);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (memberToEdit) {
      setName(memberToEdit.name);
      setEmail(memberToEdit.email ?? '');
      setAuthUserId(memberToEdit.authUserId ?? '');
      setAvatarColor(memberToEdit.avatarColor || HOUSEHOLD_MEMBER_COLORS[0]);
      setIsAccountHolder(!!memberToEdit.isAccountHolder);
      setNotes(memberToEdit.notes ?? '');
    } else {
      setName('');
      setEmail('');
      setAuthUserId('');
      setAvatarColor(HOUSEHOLD_MEMBER_COLORS[Math.floor(Math.random() * HOUSEHOLD_MEMBER_COLORS.length)]);
      setIsAccountHolder(false);
      setNotes('');
    }
    setErrorMsg('');
  }, [memberToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter a member name.');
      return;
    }
    onSaveMember(
      {
        name: name.trim(),
        email: email.trim() || '',
        authUserId: authUserId.trim() || '',
        avatarColor,
        isAccountHolder,
        notes: notes.trim() || '',
      },
      memberToEdit?.id
    );
    onClose();
  };

  return (
    <div className="member-modal-overlay">
      <div className="member-modal-card">
        <div className="member-modal-header">
          <div className="member-modal-header-title-group">
            <Users className="member-modal-header-icon" />
            <h3 className="member-modal-header-title">
              {memberToEdit ? 'Edit Household Member' : 'Add Household Member'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="member-modal-close-btn"
          >
            <X className="member-modal-close-icon" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="member-modal-form">
          {errorMsg && (
            <div className="member-modal-error">
              <AlertCircle className="member-modal-error-icon" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="member-modal-field">
            <label className="member-modal-label">Member Name *</label>
            <input
              type="text"
              placeholder="e.g. Chelsea, Ebony, Lora, Carl"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="member-modal-input"
              required
            />
          </div>

          <div className="member-modal-field">
            <label className="member-modal-label">Email Address (Optional)</label>
            <input
              type="email"
              placeholder="e.g. chelsea@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="member-modal-input"
            />
          </div>

          <div className="member-modal-field">
            <label className="member-modal-label">Auth User ID (Optional)</label>
            <input
              type="text"
              placeholder="Supabase auth user ID"
              value={authUserId}
              onChange={(e) => setAuthUserId(e.target.value)}
              className="member-modal-input"
            />
          </div>

          <div className="member-modal-field">
            <label className="member-modal-label">Avatar Color Tag</label>
            <div className="member-modal-color-list">
              {HOUSEHOLD_MEMBER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAvatarColor(c)}
                  className="member-modal-color-btn"
                  style={{ backgroundColor: c }}
                >
                  {avatarColor === c && <Check className="member-modal-color-check" />}
                </button>
              ))}
            </div>
          </div>

          <div className="member-modal-field">
            <label className="member-modal-checkbox-label">
              <input
                type="checkbox"
                checked={isAccountHolder}
                onChange={(e) => setIsAccountHolder(e.target.checked)}
                className="member-modal-checkbox"
              />
              <div>
                <span className="member-modal-checkbox-text">
                  Make this person a co-host / joint account holder
                </span>
                <span className="member-modal-checkbox-subtext">
                  Hosts share household management and bank-import permissions.
                </span>
              </div>
            </label>
            <p className="member-modal-checkbox-note">
              The person must sign in and have their login linked to this profile.
            </p>
          </div>

          <div className="member-modal-field">
            <label className="member-modal-label">Notes / Room Details (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Room 2, pays via standing order on 1st"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="member-modal-input"
            />
          </div>

          <div className="member-modal-footer">
            <button type="button" onClick={onClose} className="member-modal-cancel-btn">
              Cancel
            </button>
            <button type="submit" className="member-modal-submit-btn">
              {memberToEdit ? 'Save Member' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};