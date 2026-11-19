import { AlertTriangleIcon, DownloadIcon } from '../../../../shared/components/Icons';

export default function TurnaroundCard({ data, loading, error, onRetry, onExport }) {
  if (loading) {
    return (
      <div className="analytics-card-skeleton">
        <div className="analytics-skeleton-box title-skeleton" />
        <div className="analytics-skeleton-box chart-skeleton" />
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

  const stages = data?.stages || [];
  if (!stages.length) {
    return <div className="analytics-empty-state">No turnaround metrics recorded yet.</div>;
  }

  return (
    <div className="analytics-chart-panel">
      <div className="analytics-panel-header">
        <div>
          <h3>Turnaround & Latency by Stage</h3>
          <p className="analytics-panel-desc">Average, Median, and 90th percentile review & issuance duration (days)</p>
        </div>
        <button type="button" className="analytics-export-icon-btn" onClick={() => onExport('turnaround')} title="Export CSV">
          <DownloadIcon size={13} /> CSV
        </button>
      </div>

      <div className="analytics-turnaround-grid">
        {stages.map((st) => (
          <div key={st.stage} className="turnaround-stage-card">
            <span className="turnaround-stage-name">{st.name}</span>
            <div className="turnaround-stat-row">
              <div className="turnaround-stat">
                <span className="stat-label">Average</span>
                <strong className="stat-val">{st.averageDays}d</strong>
              </div>
              <div className="turnaround-stat">
                <span className="stat-label">Median</span>
                <strong className="stat-val">{st.medianDays}d</strong>
              </div>
              <div className="turnaround-stat">
                <span className="stat-label">P90</span>
                <strong className="stat-val">{st.p90Days}d</strong>
              </div>
            </div>
            <small className="turnaround-sample">{st.sampleSize} requests processed</small>
          </div>
        ))}
      </div>
    </div>
  );
}
