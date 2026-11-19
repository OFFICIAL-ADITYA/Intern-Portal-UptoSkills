import {
  AlertTriangleIcon,
  UsersIcon,
  UserIcon,
  ClockIcon,
  CertificateIcon,
  SparklesIcon
} from '../../../../shared/components/Icons';

export default function KpiCards({ data, loading, error, onRetry }) {
  if (error) {
    return (
      <div className="analytics-widget-error-box">
        <span><AlertTriangleIcon size={16} /> {error}</span>
        <button type="button" onClick={onRetry} className="analytics-retry-btn">Retry KPIs</button>
      </div>
    );
  }

  const kpis = data?.kpis || {};

  const cards = [
    { label: 'Total Interns', value: kpis.totalInterns, helper: `${kpis.activeInterns ?? 0} active currently`, icon: <UsersIcon size={18} /> },
    { label: 'Active Interns', value: kpis.activeInterns, helper: `${kpis.upcomingInterns ?? 0} upcoming`, icon: <UserIcon size={18} /> },
    { label: 'Pending Requests', value: kpis.pendingRequests, helper: 'Awaiting TL or Admin', icon: <ClockIcon size={18} />, isAccent: (kpis.pendingRequests || 0) > 0 },
    { label: 'Certificates This Month', value: kpis.certificatesIssuedThisMonth, helper: `${kpis.requestsThisMonth ?? 0} requests this month`, icon: <CertificateIcon size={18} /> },
    { label: 'Avg Turnaround', value: `${kpis.averageTurnaroundDays ?? 0}d`, helper: `${kpis.approvalRate ?? 0}% approval rate`, icon: <SparklesIcon size={18} /> },
  ];

  return (
    <div className="analytics-kpi-grid">
      {cards.map((c) => (
        <article key={c.label} className={`analytics-kpi-card ${c.isAccent ? 'accent-border' : ''}`}>
          <div className="analytics-kpi-header">
            <span className="analytics-kpi-label">{c.label}</span>
            <span className="analytics-kpi-icon">{c.icon}</span>
          </div>
          {loading ? (
            <div className="analytics-skeleton-box number-skeleton" />
          ) : (
            <div className="analytics-kpi-value">{c.value ?? '—'}</div>
          )}
          <span className="analytics-kpi-helper">{c.helper}</span>
        </article>
      ))}
    </div>
  );
}
