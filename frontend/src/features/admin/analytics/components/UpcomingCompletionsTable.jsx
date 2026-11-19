import { AlertTriangleIcon, DownloadIcon, CheckIcon, ClockIcon } from '../../../../shared/components/Icons';

export default function UpcomingCompletionsTable({
  data,
  loading,
  error,
  upcomingDays,
  setUpcomingDays,
  onRetry,
  onExport,
}) {
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
          <h3>Upcoming Internship Completions</h3>
          <p className="analytics-panel-desc">Ongoing interns whose internships conclude within {upcomingDays} days</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div className="analytics-toggle-group">
            <button
              type="button"
              className={`toggle-btn ${upcomingDays === 7 ? 'active' : ''}`}
              onClick={() => setUpcomingDays(7)}
            >
              7 Days
            </button>
            <button
              type="button"
              className={`toggle-btn ${upcomingDays === 30 ? 'active' : ''}`}
              onClick={() => setUpcomingDays(30)}
            >
              30 Days
            </button>
          </div>
          <button type="button" className="analytics-export-icon-btn" onClick={() => onExport('upcoming-completions')} title="Export CSV">
            <DownloadIcon size={13} /> CSV
          </button>
        </div>
      </div>

      {!items.length ? (
        <div className="analytics-empty-state">No interns concluding in the next {upcomingDays} days.</div>
      ) : (
        <div className="analytics-table-responsive">
          <table className="analytics-data-table">
            <thead>
              <tr>
                <th>Intern Name</th>
                <th>Domain</th>
                <th>End Date</th>
                <th>Days Left</th>
                <th>Completion Certificate</th>
              </tr>
            </thead>
            <tbody>
              {items.map((intern) => (
                <tr key={intern.id}>
                  <td>
                    <strong>{intern.fullName}</strong>
                    <br />
                    <small className="tl-email">{intern.email}</small>
                  </td>
                  <td>{intern.domain}</td>
                  <td>{new Date(intern.endDate).toLocaleDateString()}</td>
                  <td>
                    <span className="badge-days">{intern.daysRemaining}d left</span>
                  </td>
                  <td>
                    {intern.hasRequestedCertificate ? (
                      <span className="badge-cert-requested"><CheckIcon size={12} /> Requested</span>
                    ) : (
                      <span className="badge-cert-missing"><ClockIcon size={12} /> Not Requested Yet</span>
                    )}
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
