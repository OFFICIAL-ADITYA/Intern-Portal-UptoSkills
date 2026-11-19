import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangleIcon, XIcon } from '../../../../shared/components/Icons';
import { getFilteredRequests } from '../services/analytics.service';

export default function FilteredRequestsModal({ status, onClose }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getFilteredRequests({ status, limit: 25 })
      .then((res) => {
        if (mounted) {
          setRequests(res?.requests || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.response?.data?.message || err.message || 'Failed to load requests.');
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [status]);

  return (
    <div className="analytics-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="analytics-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="analytics-modal-header">
          <div>
            <h3>Filtered Requests ({status.toUpperCase()})</h3>
            <p className="analytics-modal-desc">Certificate requests currently matching this status segment</p>
          </div>
          <button type="button" className="analytics-modal-close" onClick={onClose} aria-label="Close modal">
            <XIcon size={16} />
          </button>
        </div>

        <div className="analytics-modal-body">
          {loading ? (
            <div className="analytics-modal-loading">Loading matching requests…</div>
          ) : error ? (
            <div className="analytics-modal-error">
              <AlertTriangleIcon size={16} /> {error}
            </div>
          ) : !requests.length ? (
            <div className="analytics-empty-state">No requests currently in {status} status.</div>
          ) : (
            <table className="analytics-data-table">
              <thead>
                <tr>
                  <th>Request #</th>
                  <th>Intern</th>
                  <th>Type</th>
                  <th>Requested At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r._id}>
                    <td><strong>{r.requestNumber || 'CERT-REQ'}</strong></td>
                    <td>
                      <span>{r.userId?.fullName || 'Intern'}</span>
                      <br />
                      <small className="tl-email">{r.userId?.email}</small>
                    </td>
                    <td>{(r.certificateType || '').replace(/_/g, ' ')}</td>
                    <td>{new Date(r.requestedAt || r.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        type="button"
                        className="analytics-action-btn"
                        onClick={() => navigate(`/admin/certificates/${r._id}`)}
                      >
                        Inspect →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
