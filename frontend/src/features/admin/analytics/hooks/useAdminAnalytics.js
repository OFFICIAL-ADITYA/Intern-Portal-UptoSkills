import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getOverview,
  getRequestsTrend,
  getCertificateTypes,
  getTurnaround,
  getTeamLeaders,
  getDomains,
  getPipeline,
  getStuckRequests,
  getUpcomingCompletions,
  exportReport,
} from '../services/analytics.service';
import { getAllTeamLeaders } from '../../services/admin.service';

const formatDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const useAdminAnalytics = () => {
  const [rangePreset, setRangePreset] = useState('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [selectedTeamLeader, setSelectedTeamLeader] = useState('');
  const [overdueDays, setOverdueDays] = useState('3');
  const [upcomingDays, setUpcomingDays] = useState(30);

  const [teamLeadersList, setTeamLeadersList] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Widget States (Data, Loading, Error)
  const [widgets, setWidgets] = useState({
    overview: { data: null, loading: true, error: null },
    trend: { data: null, loading: true, error: null },
    types: { data: null, loading: true, error: null },
    turnaround: { data: null, loading: true, error: null },
    teamLeaders: { data: null, loading: true, error: null },
    domains: { data: null, loading: true, error: null },
    pipeline: { data: null, loading: true, error: null },
    stuck: { data: null, loading: true, error: null },
    completions: { data: null, loading: true, error: null },
  });

  // Calculate normalized date range
  const filterParams = useMemo(() => {
    const params = {
      domain: selectedDomain || undefined,
      teamLeaderId: selectedTeamLeader || undefined,
      overdueDays: overdueDays || undefined,
    };

    if (rangePreset === 'custom') {
      if (customFrom) params.from = customFrom;
      if (customTo) params.to = customTo;
    } else {
      const end = new Date();
      const start = new Date(end);
      if (rangePreset === '7d') start.setDate(start.getDate() - 6);
      else if (rangePreset === '30d') start.setDate(start.getDate() - 29);
      else start.setMonth(start.getMonth() - 5, 1); // 6 months

      params.from = formatDate(start);
      params.to = formatDate(end);
      params.range = rangePreset;
    }

    return params;
  }, [rangePreset, customFrom, customTo, selectedDomain, selectedTeamLeader, overdueDays]);

  // Load team leaders dropdown once
  useEffect(() => {
    let mounted = true;
    getAllTeamLeaders()
      .then((res) => {
        if (mounted && res?.teamLeaders) {
          setTeamLeadersList(res.teamLeaders);
        }
      })
      .catch((err) => console.warn('Could not load team leaders for filter:', err));
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch individual widget with isolated error state
  const fetchWidget = useCallback(async (key) => {
    setWidgets((prev) => ({
      ...prev,
      [key]: { ...prev[key], loading: true, error: null },
    }));

    try {
      let data = null;
      switch (key) {
        case 'overview':
          data = await getOverview(filterParams);
          break;
        case 'trend':
          data = await getRequestsTrend({
            ...filterParams,
            groupBy: rangePreset === '7d' ? 'day' : 'month',
          });
          break;
        case 'types':
          data = await getCertificateTypes(filterParams);
          break;
        case 'turnaround':
          data = await getTurnaround(filterParams);
          break;
        case 'teamLeaders':
          data = await getTeamLeaders(filterParams);
          break;
        case 'domains':
          data = await getDomains(filterParams);
          break;
        case 'pipeline':
          data = await getPipeline(filterParams);
          break;
        case 'stuck':
          data = await getStuckRequests(filterParams);
          break;
        case 'completions':
          data = await getUpcomingCompletions({
            ...filterParams,
            days: upcomingDays,
          });
          break;
        default:
          break;
      }

      setWidgets((prev) => ({
        ...prev,
        [key]: { data, loading: false, error: null },
      }));
    } catch (err) {
      setWidgets((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          loading: false,
          error: err.response?.data?.message || err.message || 'Failed to load widget data.',
        },
      }));
    }
  }, [filterParams, rangePreset, upcomingDays]);

  // Fetch all widgets in parallel
  const refreshAll = useCallback(async () => {
    const keys = Object.keys(widgets);
    await Promise.allSettled(keys.map((k) => fetchWidget(k)));
    setLastUpdated(new Date());
  }, [fetchWidget, widgets]);

  // Automatically fetch when filters or preset changes
  useEffect(() => {
    refreshAll();
  }, [filterParams, upcomingDays]);

  // Export report helper
  const handleExport = useCallback(async (type, format = 'csv') => {
    const res = await exportReport(type, filterParams, format);
    const blob = new Blob([res.data], {
      type: format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv;charset=utf-8',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${type}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, [filterParams]);

  return {
    rangePreset,
    setRangePreset,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    selectedDomain,
    setSelectedDomain,
    selectedTeamLeader,
    setSelectedTeamLeader,
    overdueDays,
    setOverdueDays,
    upcomingDays,
    setUpcomingDays,
    teamLeadersList,
    widgets,
    fetchWidget,
    refreshAll,
    lastUpdated,
    handleExport,
  };
};

export default useAdminAnalytics;
