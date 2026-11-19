import { useState, Fragment } from 'react';
import './AuditLogTable.css';

// Helper for relative time
function formatRelativeTime(dateInput) {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '—';
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Action badge color mapper
function getActionBadgeClass(action = '') {
  const act = action.toUpperCase();
  if (act.includes('REJECT') || act.includes('REVOKE') || act.includes('FAILED') || act.includes('PURGE')) {
    return 'audit-badge-danger';
  }
  if (act.includes('APPROVE') || act.includes('CREATED') || act.includes('COMPLETED') || act.includes('RESTORE')) {
    return 'audit-badge-success';
  }
  if (act.includes('FORWARD') || act.includes('SUBMIT') || act.includes('DRAFT') || act.includes('LOGIN')) {
    return 'audit-badge-info';
  }
  if (act.includes('EDIT') || act.includes('UPDATE') || act.includes('TOGGLE')) {
    return 'audit-badge-warning';
  }
  return 'audit-badge-neutral';
}

export default function AuditLogTable({
  logs = [],
  loading = false,
  error = null,
  page = 1,
  totalPages = 1,
  total = 0,
  exporting = false,
  onPageChange,
  onExport,
  onRetry
}) {
  const [expandedRowId, setExpandedRowId] = useState(null);

  const toggleRow = (id) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="audit-table-card">
      <div className="audit-table-header">
        <div>
          <h3>Audit Activity Log</h3>
          <p className="audit-table-subtitle">
            Showing {logs.length} of {total} recorded system events
          </p>
        </div>
        <div className="audit-table-actions">
          <button
            type="button"
            className="audit-export-btn"
            onClick={onExport}
            disabled={exporting || loading || logs.length === 0}
            title="Download CSV for current filters"
          >
            {exporting ? 'Exporting...' : '⬇ Export CSV'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="audit-error-state" role="alert">
          <p className="audit-error-msg">{error}</p>
          {onRetry && (
            <button type="button" className="audit-retry-btn" onClick={onRetry}>
              Retry
            </button>
          )}
        </div>
      ) : (
        <div className="audit-table-responsive">
          <table className="audit-table" aria-label="System audit log records">
            <thead>
              <tr>
                <th className="th-expand" aria-label="Expand row"></th>
                <th className="th-time">Time</th>
                <th className="th-actor">Actor</th>
                <th className="th-action">Action</th>
                <th className="th-target">Target</th>
                <th className="th-ip">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // Skeleton loading rows
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={`skel-${idx}`} className="audit-skeleton-row">
                    <td><div className="audit-skel-cell" style={{ width: '20px' }}></div></td>
                    <td><div className="audit-skel-cell" style={{ width: '80px' }}></div></td>
                    <td><div className="audit-skel-cell" style={{ width: '130px' }}></div></td>
                    <td><div className="audit-skel-cell" style={{ width: '100px' }}></div></td>
                    <td><div className="audit-skel-cell" style={{ width: '90px' }}></div></td>
                    <td><div className="audit-skel-cell" style={{ width: '90px' }}></div></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="audit-empty-state">
                    No activity for this filter
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedRowId === log._id;
                  const exactTime = log.createdAt ? new Date(log.createdAt).toLocaleString() : '—';
                  const relativeTime = formatRelativeTime(log.createdAt);
                  const actorName = log.actorId?.fullName || (log.actorRole === 'system' ? 'System' : 'Unknown');
                  const actorEmail = log.actorId?.email || '';
                  const hasMeta = log.meta && Object.keys(log.meta).length > 0;

                  return (
                    <Fragment key={log._id}>
                      <tr
                        className={`audit-log-row ${isExpanded ? 'expanded' : ''} ${hasMeta ? 'clickable' : ''}`}
                        onClick={() => hasMeta && toggleRow(log._id)}
                      >
                        <td className="audit-expand-cell">
                          {hasMeta && (
                            <button
                              type="button"
                              className="audit-expand-toggle"
                              aria-label={isExpanded ? 'Collapse metadata' : 'Expand metadata'}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRow(log._id);
                              }}
                            >
                              {isExpanded ? '▼' : '▶'}
                            </button>
                          )}
                        </td>
                        <td className="audit-time-cell">
                          <span title={exactTime} className="audit-relative-time">
                            {relativeTime}
                          </span>
                        </td>
                        <td className="audit-actor-cell">
                          <div className="audit-actor-info">
                            <span className="audit-actor-name">{actorName}</span>
                            {actorEmail && <span className="audit-actor-email">{actorEmail}</span>}
                            <span className={`audit-role-tag role-${log.actorRole || 'system'}`}>
                              {log.actorRole || 'system'}
                            </span>
                          </div>
                        </td>
                        <td className="audit-action-cell">
                          <span className={`audit-badge ${getActionBadgeClass(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="audit-target-cell">
                          <div className="audit-target-wrap">
                            <span className="audit-target-type">{log.targetType || '—'}</span>
                            {log.targetId && (
                              <span className="audit-target-id" title={String(log.targetId)}>
                                {String(log.targetId).slice(-8)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="audit-ip-cell">
                          <code>{log.ip || '—'}</code>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="audit-meta-row">
                          <td colSpan="6">
                            <div className="audit-meta-container">
                              <p className="audit-meta-title">Event Metadata &amp; Request Details</p>
                              {log.userAgent && (
                                <p className="audit-user-agent">
                                  <strong>User Agent:</strong> {log.userAgent}
                                </p>
                              )}
                              <pre className="audit-meta-json">
                                {JSON.stringify(log.meta, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {!loading && !error && totalPages > 1 && (
        <div className="audit-pagination" role="navigation" aria-label="Audit logs pagination">
          <button
            type="button"
            className="audit-page-btn"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            ← Previous
          </button>
          <span className="audit-page-info">
            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
          </span>
          <button
            type="button"
            className="audit-page-btn"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
