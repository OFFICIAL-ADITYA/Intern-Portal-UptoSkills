import { useState } from 'react';
import ChangePasswordForm from '../components/ChangePasswordForm';
import { updateProfile } from '../services/intern.service';
import Toast from '../../shared/components/Toast';
import './SettingsPage.css';

export default function SettingsPage({ profile, onProfileUpdated }) {
  const [isEditingMobile, setIsEditingMobile] = useState(false);
  const [mobileValue, setMobileValue] = useState(profile?.mobileNo || '');
  const [mobileLoading, setMobileLoading] = useState(false);
  const [mobileError, setMobileError] = useState('');
  const [toast, setToast] = useState(null);

  const handleMobileSave = async () => {
    setMobileError('');
    const trimmed = mobileValue.trim();
    const mobileRegex = /^[0-9+\-\s()]{7,20}$/;
    if (trimmed && !mobileRegex.test(trimmed)) {
      setMobileError('Please enter a valid phone number (7-20 digits).');
      return;
    }

    try {
      setMobileLoading(true);
      await updateProfile({ mobileNo: trimmed });
      setIsEditingMobile(false);
      setToast({ message: 'Mobile number updated successfully!', type: 'success' });
      if (onProfileUpdated) {
        onProfileUpdated();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update mobile number.';
      setMobileError(msg);
      setToast({ message: msg, type: 'error' });
    } finally {
      setMobileLoading(false);
    }
  };

  const handleMobileCancel = () => {
    setMobileValue(profile?.mobileNo || '');
    setMobileError('');
    setIsEditingMobile(false);
  };

  return (
    <div className="settings-page-container">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Profile & Contact Details Card */}
      <section className="settings-card" aria-label="Personal and contact information">
        <h3>Profile & Contact Information</h3>
        <p className="settings-section-desc">
          Your official intern details. You can update your contact phone number below.
        </p>

        <div className="settings-grid">
          <div className="settings-field">
            <label>Full Name</label>
            <div className="settings-field-value readonly">{profile?.fullName || '—'}</div>
          </div>

          <div className="settings-field">
            <label>Email Address</label>
            <div className="settings-field-value readonly">{profile?.email || '—'}</div>
          </div>

          <div className="settings-field">
            <label>Intern Code</label>
            <div className="settings-field-value readonly">{profile?.internCode || '—'}</div>
          </div>

          <div className="settings-field">
            <label>Domain</label>
            <div className="settings-field-value readonly">{profile?.domain || '—'}</div>
          </div>
        </div>

        {/* Editable Mobile Number */}
        <div className="settings-field" style={{ marginTop: '1.25rem' }}>
          <label htmlFor="settings-mobile-input">Mobile Phone Number</label>
          {isEditingMobile ? (
            <div>
              <div className="editable-field-row">
                <input
                  id="settings-mobile-input"
                  type="tel"
                  value={mobileValue}
                  onChange={(e) => setMobileValue(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  disabled={mobileLoading}
                />
                <button
                  type="button"
                  className="settings-btn-inline btn-primary-small"
                  onClick={handleMobileSave}
                  disabled={mobileLoading}
                >
                  {mobileLoading ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  className="settings-btn-inline btn-secondary"
                  onClick={handleMobileCancel}
                  disabled={mobileLoading}
                >
                  Cancel
                </button>
              </div>
              {mobileError && <small className="field-hint-error">{mobileError}</small>}
            </div>
          ) : (
            <div className="editable-field-row">
              <div className="settings-field-value" style={{ flex: 1 }}>
                {profile?.mobileNo || <span style={{ color: '#94a3b8' }}>No phone number added</span>}
              </div>
              <button
                type="button"
                className="settings-btn-inline btn-secondary"
                onClick={() => {
                  setMobileValue(profile?.mobileNo || '');
                  setIsEditingMobile(true);
                }}
              >
                Edit Number
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Security & Password Card */}
      <section className="settings-card" aria-label="Account password and security">
        <ChangePasswordForm
          profile={profile}
          onPasswordChanged={onProfileUpdated}
          onToast={(t) => setToast(t)}
        />
      </section>
    </div>
  );
}
