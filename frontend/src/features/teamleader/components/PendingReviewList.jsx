import { useState } from 'react';
import useReviewRequests from '../hooks/useReviewRequests';
import StatusBadge from '../../shared/components/StatusBadge';
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  XIcon,
  LockIcon,
  UsersIcon,
  CalendarIcon,
  CertificateIcon
} from '../../../shared/components/Icons';
import './PendingReviewList.css';

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

export default function PendingReviewList() {
  const { requests, loading, error, forwardRequest, rejectRequest } = useReviewRequests();
  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const forward = async (id) => {
    setActionError(null);
    setProcessingId(id);
    try {
      await forwardRequest(id);
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setProcessingId(null);
    }
  };

  const reject = async (id) => {
    if (!reason.trim()) return;
    setActionError(null);
    setProcessingId(id);
    try {
      await rejectRequest(id, reason.trim());
      setRejectingId(null);
      setReason('');
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <section className="review-panel" aria-labelledby="review-title">
      <div className="review-heading">
        <div>
          <p className="request-eyebrow">INBOX</p>
          <h2 id="review-title">Pending Certificate Reviews</h2>
          <p className="review-subtitle">Review and verify certificate requests from your assigned interns.</p>
        </div>
        {!loading && (
          <span className="review-count">
            {requests.length} {requests.length === 1 ? 'request' : 'requests'} pending
          </span>
        )}
      </div>

      {actionError && (
        <div className="review-error-banner" role="alert">
          <span>
            <AlertTriangleIcon size={16} /> {actionError}
          </span>
          <button type="button" onClick={() => setActionError(null)} aria-label="Dismiss error">
            <XIcon size={14} />
          </button>
        </div>
      )}

      {loading && (
        <div className="review-loading-state" role="status">
          <div className="spinner" />
          <span>Loading pending reviews…</span>
        </div>
      )}

      {!loading && error && (
        <div className="review-error-banner" role="alert">
          <span>
            <AlertTriangleIcon size={16} /> {error}
          </span>
        </div>
      )}

      {!loading && !error && !requests.length && (
        <div className="review-empty-state">
          <span className="review-empty-icon">
            <CheckCircleIcon size={32} />
          </span>
          <h3>All caught up!</h3>
          <p>There are no certificate requests pending your review at this time.</p>
        </div>
      )}

      {!loading && requests.length > 0 && (
        <div className="review-list">
          {requests.map((request) => {
            const id = request._id || request.id;
            const intern = request.userId || {};
            const isProcessing = processingId === id;

            return (
              <article className="review-row" key={id}>
                <div className="review-details">
                  <div className="review-intern-header">
                    <h3>{intern.fullName || 'Unknown Intern'}</h3>
                    <StatusBadge status={request.status || 'pending'} />
                  </div>

                  <p className="review-meta">
                    <span><LockIcon size={12} /> <strong>{intern.internCode || '—'}</strong></span>
                    <span><UsersIcon size={12} /> <strong>{intern.domain || '—'}</strong></span>
                    <span><CalendarIcon size={12} /> Requested on <strong>{formatDate(request.requestedAt || request.createdAt)}</strong></span>
                  </p>

                  <div className="review-cert-type">
                    <span className="cert-type-pill">
                      <CertificateIcon size={13} /> {request.certificateType?.replaceAll('_', ' ') || '—'}
                    </span>
                  </div>

                  <p className="review-reason">
                    <strong>Reason:</strong> {request.reason || 'No justification provided'}
                  </p>
                </div>

                <div className="review-actions">
                  {rejectingId === id ? (
                    <div className="reject-form">
                      <input
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="Enter rejection reason..."
                        aria-label="Rejection reason"
                        autoFocus
                        disabled={isProcessing}
                      />
                      <button
                        type="button"
                        className="btn-confirm-reject"
                        onClick={() => reject(id)}
                        disabled={!reason.trim() || isProcessing}
                      >
                        {isProcessing ? 'Rejecting...' : 'Confirm'}
                      </button>
                      <button
                        type="button"
                        className="btn-cancel-reject"
                        onClick={() => {
                          setRejectingId(null);
                          setReason('');
                        }}
                        disabled={isProcessing}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="review-action-buttons">
                      <button
                        type="button"
                        className="forward-button"
                        onClick={() => forward(id)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? 'Forwarding...' : 'Forward to Admin →'}
                      </button>
                      <button
                        type="button"
                        className="reject-button"
                        onClick={() => setRejectingId(id)}
                        disabled={isProcessing}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
