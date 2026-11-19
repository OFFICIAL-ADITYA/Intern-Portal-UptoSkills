import { useNavigate } from 'react-router-dom';
import { AlertTriangleIcon, DownloadIcon, CheckCircleIcon } from '../../../../shared/components/Icons';

export default function StuckRequestsTable({ data, loading, error, onRetry, onExport, onNavigateToReview }) {
  const navigate = useNavigate();
  if (loading) {
    return (
      <div className="analytics-card-skeleton">
        <div className="analytics-skeleton-box title-skeleton" />
        <div className="analytics-skeleton-box table-skeleton" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-widget-error-box">
        <span><AlertTriangleIcon size={14} /> {error}</span>
        <button type="button" onClick={onRetry} className="analytics-retry-btn">Retry</button>
      </div>
    );
  }

  const items = data?.items || [];

  return (
    <div className="analytics-table-panel">
      <div className="analytics-panel-header">
        <div>
          <h3>Overdue & Stuck Requests</h3>
          <p className="analytics-panel-desc">Requests waiting longer than {data?.overdueDays ?? 3} days for decision</p>
        </div>
        <button type="button" className="analytics-export-icon-btn" onClick={() => onExport('stuck')} title="Export CSV">
          <DownloadIcon size={13} /> CSV
        </button>
      </div>

      {!items.length ? (
        <div className="analytics-empty-state clean-state">
          <span><CheckCircleIcon size={16} /></span> No requests are currently stuck or overdue!
        </div>
      ) : (
        <div className="analytics-table-responsive">
          <table className="analytics-data-table">
            <thead>
              <tr>
                <th>Request #</th>
                <th>Intern</th>
                <th>Type</th>
                <th>Stuck At</th>
                <th>Waiting</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="stuck-row">
                  <td><strong>{item.requestNumber || 'CERT-REQ'}</strong></td>
                  <td>
                    <span>{item.internName}</span>
                    <br />
                    <small className="tl-email">{item.internEmail}</small>
                  </td>
                  <td>{(item.certificateType || '').replace(/_/g, ' ')}</td>
                  <td>
                    <span className={`badge-stage stage-${item.status}`}>
                      {item.stuckAt} ({item.status})
                    </span>
                  </td>
                  <td>
                    <strong className="text-danger">{item.waitingDays} days</strong>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="analytics-action-btn"
                      onClick={() => {
                        if (onNavigateToReview) onNavigateToReview(item.id);
                        else navigate(`/admin/certificates/${item.id}`);
                      }}
                    >
                      Review →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
