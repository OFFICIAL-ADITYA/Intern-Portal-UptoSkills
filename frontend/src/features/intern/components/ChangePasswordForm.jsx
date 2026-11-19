import { useState } from 'react';
import { setPassword } from '../services/intern.service';
import { AlertTriangleIcon, CheckIcon } from '../../../shared/components/Icons';

export default function ChangePasswordForm({ profile, onPasswordChanged, onToast }) {
  const [currentSecret, setCurrentSecret] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const hasPasswordSet = Boolean(profile?.passwordSetAt);
  const secretLabel = hasPasswordSet ? 'Current Password' : 'Intern Code or Current Password';

  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[A-Za-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const isStrengthValid = hasMinLength && hasLetter && hasNumber;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!currentSecret.trim()) {
      setFormError('Please enter your current secret or password.');
      return;
    }

    if (!isStrengthValid) {
      setFormError('New password does not meet the minimum requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError('New password and confirmation do not match.');
      return;
    }

    try {
      setLoading(true);
      await setPassword({
        currentSecret: currentSecret.trim(),
        newPassword: newPassword.trim(),
      });

      setCurrentSecret('');
      setNewPassword('');
      setConfirmPassword('');
      if (onToast) {
        onToast({
          message: 'Password updated successfully! You will now use this password to log in.',
          type: 'success',
        });
      }
      if (onPasswordChanged) {
        onPasswordChanged();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update password.';
      setFormError(msg);
      if (onToast) {
        onToast({ message: msg, type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="settings-form" onSubmit={handleSubmit} noValidate>
      <h3>Security & Password</h3>
      <p className="settings-section-desc">
        {hasPasswordSet
          ? 'Update your account password regularly to keep your credentials safe.'
          : 'You are currently using your Intern Code as your login secret. Set your own personal password below.'}
      </p>

      {formError && (
        <div className="settings-inline-error" role="alert">
          <span><AlertTriangleIcon size={14} /></span> {formError}
        </div>
      )}

      <div className="settings-field">
        <label htmlFor="current-secret-input">{secretLabel} <span className="required">*</span></label>
        <div className="settings-input-wrapper">
          <input
            id="current-secret-input"
            type={showPasswords ? 'text' : 'password'}
            placeholder={hasPasswordSet ? 'Enter current password' : 'Enter UTS-... intern code'}
            value={currentSecret}
            onChange={(e) => setCurrentSecret(e.target.value)}
            disabled={loading}
            required
          />
        </div>
      </div>

      <div className="settings-field">
        <label htmlFor="new-password-input">New Password <span className="required">*</span></label>
        <div className="settings-input-wrapper">
          <input
            id="new-password-input"
            type={showPasswords ? 'text' : 'password'}
            placeholder="Enter at least 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        <div className="password-hints" aria-live="polite">
          <span className={`hint-pill ${hasMinLength ? 'valid' : ''}`}>
            {hasMinLength ? <CheckIcon size={12} /> : '•'} 8+ characters
          </span>
          <span className={`hint-pill ${hasLetter ? 'valid' : ''}`}>
            {hasLetter ? <CheckIcon size={12} /> : '•'} 1+ letter
          </span>
          <span className={`hint-pill ${hasNumber ? 'valid' : ''}`}>
            {hasNumber ? <CheckIcon size={12} /> : '•'} 1+ number
          </span>
        </div>
      </div>

      <div className="settings-field">
        <label htmlFor="confirm-password-input">Confirm New Password <span className="required">*</span></label>
        <div className="settings-input-wrapper">
          <input
            id="confirm-password-input"
            type={showPasswords ? 'text' : 'password'}
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        {confirmPassword && newPassword !== confirmPassword && (
          <small className="field-hint-error">Passwords do not match</small>
        )}
      </div>

      <div className="settings-checkbox-row">
        <label className="settings-checkbox-label">
          <input
            type="checkbox"
            checked={showPasswords}
            onChange={(e) => setShowPasswords(e.target.checked)}
          />
          Show password characters
        </label>
      </div>

      <div className="settings-actions">
        <button
          type="submit"
          className="id-primary-btn"
          disabled={loading || !currentSecret || !isStrengthValid || newPassword !== confirmPassword}
        >
          {loading ? 'Updating Password…' : 'Save New Password'}
        </button>
      </div>
    </form>
  );
}
