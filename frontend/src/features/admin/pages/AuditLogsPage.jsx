import { useSearchParams } from 'react-router-dom';
import useAuditLogs from '../hooks/useAuditLogs';
import AuditLogFilters from '../components/AuditLogFilters';
import AuditLogTable from '../components/AuditLogTable';
import Toast from '../../shared/components/Toast';
import { useState } from 'react';
import './AuditLogsPage.css';

export default function AuditLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [toast, setToast] = useState(null);

  // Parse filters from URL query parameters
  const initialFilters = {
    actor: searchParams.get('actor') || '',
    action: searchParams.get('action') || '',
    targetType: searchParams.get('targetType') || '',
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
    page: parseInt(searchParams.get('page'), 10) || 1
  };

  const {
    logs,
    loading,
    error,
    page,
    totalPages,
    total,
    filters,
    exporting,
    setPage,
    setFilters,
    refetch,
    exportLogs
  } = useAuditLogs(initialFilters);

  // Keep URL search params synchronized so views can be shared
  const updateUrlParams = (newFilters, newPage) => {
    const params = new URLSearchParams();
    const merged = { ...filters, ...newFilters };
    const p = newPage !== undefined ? newPage : page;

    if (merged.actor) params.set('actor', merged.actor);
    if (merged.action) params.set('action', merged.action);
    if (merged.targetType) params.set('targetType', merged.targetType);
    if (merged.from) params.set('from', merged.from);
    if (merged.to) params.set('to', merged.to);
    if (p > 1) params.set('page', String(p));

    setSearchParams(params, { replace: true });
  };

  const handleFilterChange = (updated) => {
    setFilters(updated);
    updateUrlParams(updated, 1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    updateUrlParams(filters, newPage);
  };

  const handleResetFilters = () => {
    const empty = { actor: '', action: '', targetType: '', from: '', to: '' };
    setFilters(empty);
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const handleExport = async () => {
    try {
      await exportLogs();
      setToast({ message: 'Audit logs exported successfully as CSV.', type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Export failed.', type: 'error' });
    }
  };

  return (
    <div className="audit-logs-page">
      <header className="audit-page-header">
        <p className="admin-eyebrow">AUDIT &amp; COMPLIANCE</p>
        <h1>Audit Trail</h1>
        <p className="audit-page-desc">
          Inspect, filter, and export a complete log of administrative decisions, logins, certificate issuances, and system jobs.
        </p>
      </header>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <AuditLogFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      <AuditLogTable
        logs={logs}
        loading={loading}
        error={error}
        page={page}
        totalPages={totalPages}
        total={total}
        exporting={exporting}
        onPageChange={handlePageChange}
        onExport={handleExport}
        onRetry={refetch}
      />
    </div>
  );
}
