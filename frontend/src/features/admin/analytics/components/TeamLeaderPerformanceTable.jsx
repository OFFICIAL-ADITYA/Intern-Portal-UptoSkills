import { useState, useMemo } from 'react';
import { AlertTriangleIcon, DownloadIcon } from '../../../../shared/components/Icons';

export default function TeamLeaderPerformanceTable({ data, loading, error, onRetry, onExport }) {
  const [sortField, setSortField] = useState('overdueRequests');
  const [sortOrder, setSortOrder] = useState('desc');

  const items = useMemo(() => {
    const list = [...(data?.items || [])];
    list.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc' ? (aVal - bVal) : (bVal - aVal);
    });
    return list;
  }, [data, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

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

  return (
    <div className="analytics-table-panel">
      <div className="analytics-panel-header">
        <div>
          <h3>Team Leader Performance</h3>
          <p className="analytics-panel-desc">Review speed, pending requests, and overdue flags by leader</p>
        </div>
        <button type="button" className="analytics-export-icon-btn" onClick={() => onExport('team-leaders')} title="Export CSV">
          <DownloadIcon size={13} /> CSV
        </button>
      </div>

      {!items.length ? (
        <div className="analytics-empty-state">No team leader activity recorded.</div>
      ) : (
        <div className="analytics-table-responsive">
          <table className="analytics-data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('fullName')}>Team Leader {sortField === 'fullName' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('internsAssigned')}>Interns {sortField === 'internsAssigned' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('requestsReceived')}>Received {sortField === 'requestsReceived' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('requestsForwarded')}>Forwarded {sortField === 'requestsForwarded' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('requestsPending')}>Pending {sortField === 'requestsPending' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('overdueRequests')}>Overdue {sortField === 'overdueRequests' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('averageDecisionDays')}>Avg Days {sortField === 'averageDecisionDays' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('rejectionRate')}>Rejection % {sortField === 'rejectionRate' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((tl) => (
                <tr key={tl.id} className={tl.hasOverdue ? 'overdue-row' : ''}>
                  <td>
                    <strong>{tl.fullName}</strong>
                    <br />
                    <small className="tl-email">{tl.email}</small>
                  </td>
                  <td>{tl.internsAssigned}</td>
                  <td>{tl.requestsReceived}</td>
                  <td><span className="badge-forwarded">{tl.requestsForwarded}</span></td>
                  <td>{tl.requestsPending}</td>
                  <td>
                    {tl.overdueRequests > 0 ? (
                      <span className="badge-overdue-alert"><AlertTriangleIcon size={12} /> {tl.overdueRequests} overdue</span>
                    ) : (
                      <span className="badge-clean">0</span>
                    )}
                  </td>
                  <td>{tl.averageDecisionDays}d</td>
                  <td>{tl.rejectionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
