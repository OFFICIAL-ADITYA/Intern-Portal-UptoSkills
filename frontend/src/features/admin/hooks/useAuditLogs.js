import { useState, useEffect, useCallback } from 'react';
import { getAuditLogs, exportAuditLogs } from '../services/admin.service';

export const useAuditLogs = (initialFilters = {}) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(initialFilters.page || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    actor: initialFilters.actor || '',
    action: initialFilters.action || '',
    targetType: initialFilters.targetType || '',
    from: initialFilters.from || '',
    to: initialFilters.to || '',
    limit: initialFilters.limit || 20,
    ...initialFilters
  });
  const [exporting, setExporting] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAuditLogs({ ...filters, page });
      setLogs(data.logs || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load audit logs.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1); // Reset to page 1 on filter changes
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await exportAuditLogs(filters);
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      throw new Error(err.message || 'Failed to export audit logs.');
    } finally {
      setExporting(false);
    }
  };

  return {
    logs,
    loading,
    error,
    page,
    totalPages,
    total,
    filters,
    exporting,
    setPage,
    setFilters: handleFilterChange,
    refetch: fetchLogs,
    exportLogs: handleExport
  };
};

export default useAuditLogs;
