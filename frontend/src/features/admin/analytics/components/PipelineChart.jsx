import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { AlertTriangleIcon, DownloadIcon } from '../../../../shared/components/Icons';

const STAGE_COLORS = {
  with_tl: '#f59e0b',
  with_admin: '#3b82f6',
  awaiting_finalization: '#10b981',
  failed_generation: '#ef4444',
  completed: '#059669',
  rejected_tl: '#94a3b8',
  rejected_admin: '#64748b',
};

export default function PipelineChart({ data, loading, error, onRetry, onExport, onStageClick }) {
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
    return <div className="analytics-empty-state">No requests currently in pipeline.</div>;
  }

  return (
    <div className="analytics-chart-panel">
      <div className="analytics-panel-header">
        <div>
          <h3>Request Pipeline Stages</h3>
          <p className="analytics-panel-desc">Click any stage to inspect matching requests</p>
        </div>
        <button type="button" className="analytics-export-icon-btn" onClick={() => onExport('pipeline')} title="Export CSV">
          <DownloadIcon size={13} /> CSV
        </button>
      </div>

      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={items}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              width={120}
            />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--color-surface, #1e293b)', borderColor: 'var(--color-border, #334155)', borderRadius: 8, color: '#f8fafc' }}
            />
            <Bar
              dataKey="count"
              name="Requests"
              radius={[0, 4, 4, 0]}
              onClick={(entry) => onStageClick?.(entry?.status)}
              cursor="pointer"
            >
              {items.map((item) => (
                <Cell key={item.stage} fill={STAGE_COLORS[item.stage] || '#3b82f6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
