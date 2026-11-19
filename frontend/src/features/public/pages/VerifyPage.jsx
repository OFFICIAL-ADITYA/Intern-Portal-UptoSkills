import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { verifyCertificate } from '../services/verify.service';
import {
  BrandLogo,
  AlertTriangleIcon,
  InfoIcon,
  XCircleIcon,
  CheckCircleIcon
} from '../../../shared/components/Icons';
import './VerifyPage.css';

export default function VerifyPage() {
  const { verifyId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const fetchVerification = useCallback(async () => {
    if (!verifyId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const result = await verifyCertificate(verifyId);
      if (!result) {
        setNotFound(true);
      } else {
        setData(result);
      }
    } catch (err) {
      setError(err.message || 'Unable to connect to verification server. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [verifyId]);

  useEffect(() => {
    fetchVerification();
  }, [fetchVerification]);

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="verify-page-shell">
      {/* Public Header */}
      <header className="verify-header">
        <div className="verify-brand">
          <BrandLogo height={32} />
        </div>
        <span className="verify-badge-tag">Official Verification Portal</span>
      </header>

      <main className="verify-main-container">
        {loading ? (
          <div className="verify-card verify-card-loading">
            <div className="verify-skel-icon"></div>
            <div className="verify-skel-title"></div>
            <div className="verify-skel-text"></div>
            <div className="verify-skel-details">
              <div className="verify-skel-line"></div>
              <div className="verify-skel-line"></div>
              <div className="verify-skel-line"></div>
            </div>
          </div>
        ) : error ? (
          <div className="verify-card verify-card-error">
            <div className="verify-status-icon error">
              <AlertTriangleIcon size={32} />
            </div>
            <h2>Verification Error</h2>
            <p className="verify-message">{error}</p>
            <button
              type="button"
              className="verify-retry-btn"
              onClick={fetchVerification}
            >
              Retry Verification
            </button>
          </div>
        ) : notFound ? (
          <div className="verify-card verify-card-neutral">
            <div className="verify-status-icon neutral">
              <InfoIcon size={32} />
            </div>
            <h2>Certificate Not Found</h2>
            <p className="verify-message">
              The verification code or scanned link does not match any recognized official UPTOSKILL certificate record.
            </p>
            <div className="verify-code-box">
              <span>Code: </span>
              <code>{verifyId || 'None'}</code>
            </div>
            <p className="verify-note">
              Please verify that you scanned an official QR code or check the URL for typing mistakes.
            </p>
          </div>
        ) : data?.status === 'revoked' ? (
          <div className="verify-card verify-card-revoked">
            <div className="verify-card-header revoked">
              <div className="verify-status-icon revoked">
                <XCircleIcon size={32} />
              </div>
              <span className="verify-card-badge revoked">Certificate Revoked</span>
              <h2>This Certificate Has Been Revoked</h2>
              {data.revokedAt && (
                <p className="verify-revoked-date">
                  Revoked on: <strong>{formatDate(data.revokedAt)}</strong>
                </p>
              )}
            </div>

            <div className="verify-details-grid">
              <div className="verify-field">
                <span className="verify-field-label">Recipient Name</span>
                <strong className="verify-field-value">{data.recipientName}</strong>
              </div>

              <div className="verify-field">
                <span className="verify-field-label">Certificate Title</span>
                <strong className="verify-field-value">{data.certificateTitle}</strong>
              </div>

              {data.domain && (
                <div className="verify-field">
                  <span className="verify-field-label">Domain</span>
                  <strong className="verify-field-value">{data.domain}</strong>
                </div>
              )}

              <div className="verify-field">
                <span className="verify-field-label">Original Issue Date</span>
                <strong className="verify-field-value">{formatDate(data.issuedAt)}</strong>
              </div>

              <div className="verify-field full-width">
                <span className="verify-field-label">Certificate Number</span>
                <code className="verify-cert-num">{data.certificateNumber}</code>
              </div>
            </div>

            <div className="verify-warning-banner">
              This certificate was officially issued but has since been revoked by UPTOSKILL administration and is no longer recognized as valid.
            </div>
          </div>
        ) : (
          <div className="verify-card verify-card-valid">
            <div className="verify-card-header valid">
              <div className="verify-status-icon valid">
                <CheckCircleIcon size={32} />
              </div>
              <span className="verify-card-badge valid">Authentic &amp; Valid</span>
              <h2>Official Certificate Verified</h2>
              <p className="verify-valid-sub">
                This digital credential has been verified authentic against UPTOSKILL records.
              </p>
            </div>

            <div className="verify-details-grid">
              <div className="verify-field">
                <span className="verify-field-label">Recipient Name</span>
                <strong className="verify-field-value highlight">{data.recipientName}</strong>
              </div>

              <div className="verify-field">
                <span className="verify-field-label">Certificate Title</span>
                <strong className="verify-field-value">{data.certificateTitle}</strong>
              </div>

              {data.domain && (
                <div className="verify-field">
                  <span className="verify-field-label">Specialization / Domain</span>
                  <strong className="verify-field-value">{data.domain}</strong>
                </div>
              )}

              <div className="verify-field">
                <span className="verify-field-label">Date Issued</span>
                <strong className="verify-field-value">{formatDate(data.issuedAt)}</strong>
              </div>

              <div className="verify-field full-width">
                <span className="verify-field-label">Certificate Number</span>
                <code className="verify-cert-num">{data.certificateNumber}</code>
              </div>
            </div>

            <div className="verify-security-footer">
              <div className="verify-seal-icon">
                <BrandIcon size={22} />
              </div>
              <div>
                <strong>UPTOSKILL Official Digital Credential</strong>
                <p>Authenticity verified via secure cryptographic identifier.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="verify-footer">
        <p>&copy; {new Date().getFullYear()} UPTOSKILL. All rights reserved.</p>
        <p className="verify-footer-note">
          Verification is powered by UPTOSKILL Intern Management Portal.
        </p>
      </footer>
    </div>
  );
}
