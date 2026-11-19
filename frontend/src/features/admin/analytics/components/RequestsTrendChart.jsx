import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { AlertTriangleIcon, DownloadIcon } from '../../../../shared/components/Icons';

const STATUS_COLORS = {
  Pending: '#f59e0b',
  Processing: '#3b82f6',
  Approved: '#10b981',
  Completed: '#059669',
  Rejected: '#ef4444',
};

export default function RequestsTrendChart({ data, loading, error, onRetry, onExport, onSegmentClick }) {
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

  const labels = data?.labels || [];
  const series = data?.series || [];

  if (!labels.length) {
    return <div className="analytics-empty-state">No request trends for this period.</div>;
  }

  // Transform labels and series into chart rows
  const chartData = labels.map((label, index) => {
    const row = { period: label };
    series.forEach((s) => {
      row[s.name] = s.data[index] || 0;
    });
    return row;
  });

  return (
    <div className="analytics-chart-panel">
      <div className="analytics-panel-header">
        <div>
          <h3>Requests Over Time</h3>
          <p className="analytics-panel-desc">Trends split by request status over the chosen date range</p>
        </div>
        <button type="button" className="analytics-export-icon-btn" onClick={() => onExport('requests-trend')} title="Export CSV">
          <DownloadIcon size={13} /> CSV
        </button>
      </div>

      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <defs>
              {series.map((s) => (
                <linearGradient key={s.name} id={`color-${s.name}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={STATUS_COLORS[s.name] || '#8884d8'} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={STATUS_COLORS[s.name] || '#8884d8'} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <XAxis dataKey="period" stroke="#64748b" fontSize={12} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--color-surface, #1e293b)', borderColor: 'var(--color-border, #334155)', borderRadius: 8, color: '#f8fafc' }}
            />
            <Legend
              onClick={(e) => onSegmentClick?.(e.dataKey?.toLowerCase())}
              wrapperStyle={{ cursor: 'pointer', paddingTop: 8 }}
            />
            {series.map((s) => (
              <Area
                key={s.name}
                type="monotone"
                dataKey={s.name}
                stroke={STATUS_COLORS[s.name] || '#8884d8'}
                fillOpacity={1}
                fill={`url(#color-${s.name})`}
                stackId="1"
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
