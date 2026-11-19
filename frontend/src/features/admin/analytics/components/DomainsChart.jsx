import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { AlertTriangleIcon, DownloadIcon } from '../../../../shared/components/Icons';

export default function DomainsChart({ data, loading, error, onRetry, onExport }) {
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

  const items = data?.items || [];
  if (!items.length) {
    return <div className="analytics-empty-state">No intern domain records found.</div>;
  }

  return (
    <div className="analytics-chart-panel">
      <div className="analytics-panel-header">
        <div>
          <h3>Interns per Domain</h3>
          <p className="analytics-panel-desc">Cohort distribution across technical disciplines</p>
        </div>
        <button type="button" className="analytics-export-icon-btn" onClick={() => onExport('domains')} title="Export CSV">
          <DownloadIcon size={13} /> CSV
        </button>
      </div>

      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={items} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={11}
              angle={-20}
              textAnchor="end"
              interval={0}
              tickLine={false}
            />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--color-surface, #1e293b)', borderColor: 'var(--color-border, #334155)', borderRadius: 8, color: '#f8fafc' }}
            />
            <Bar dataKey="value" name="Interns" fill="#0d9488" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
