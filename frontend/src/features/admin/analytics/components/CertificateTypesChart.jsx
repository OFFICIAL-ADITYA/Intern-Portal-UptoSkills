import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { AlertTriangleIcon, DownloadIcon } from '../../../../shared/components/Icons';

const PALETTE = ['#0d9488', '#f26a34', '#2563eb', '#10b981', '#f59e0b', '#06b6d4', '#64748b'];

export default function CertificateTypesChart({ data, loading, error, onRetry, onExport }) {
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
    return <div className="analytics-empty-state">No certificates finalized for this period.</div>;
  }

  return (
    <div className="analytics-chart-panel">
      <div className="analytics-panel-header">
        <div>
          <h3>Certificate Types</h3>
          <p className="analytics-panel-desc">Distribution of certificates issued by category</p>
        </div>
        <button type="button" className="analytics-export-icon-btn" onClick={() => onExport('certificate-types')} title="Export CSV">
          <DownloadIcon size={13} /> CSV
        </button>
      </div>

      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={items}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {items.map((_, index) => (
                <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--color-surface, #1e293b)', borderColor: 'var(--color-border, #334155)', borderRadius: 8, color: '#f8fafc' }}
            />
            <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
