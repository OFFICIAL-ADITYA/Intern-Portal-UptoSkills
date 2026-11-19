import { useState } from 'react';
import useAdminAnalytics from '../hooks/useAdminAnalytics';
import KpiCards from '../components/KpiCards';
import RequestsTrendChart from '../components/RequestsTrendChart';
import CertificateTypesChart from '../components/CertificateTypesChart';
import DomainsChart from '../components/DomainsChart';
import PipelineChart from '../components/PipelineChart';
import TurnaroundCard from '../components/TurnaroundCard';
import TeamLeaderPerformanceTable from '../components/TeamLeaderPerformanceTable';
import StuckRequestsTable from '../components/StuckRequestsTable';
import UpcomingCompletionsTable from '../components/UpcomingCompletionsTable';
import FilteredRequestsModal from '../components/FilteredRequestsModal';
import AnalyticsFilters from '../components/AnalyticsFilters';
import Toast from '../../../shared/components/Toast';
import './AdminAnalytics.css';

export default function AdminAnalyticsPage() {
  const {
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
    upcomingDays,
    setUpcomingDays,
    teamLeadersList,
    widgets,
    fetchWidget,
    refreshAll,
    lastUpdated,
    handleExport,
  } = useAdminAnalytics();

  const [filteredStatusModal, setFilteredStatusModal] = useState(null);
  const [toast, setToast] = useState(null);

  const triggerExport = async (type) => {
    try {
      await handleExport(type, 'csv');
      setToast({ message: `Exported ${type.replace(/-/g, ' ')} successfully!`, type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Export failed.', type: 'error' });
    }
  };

  return (
    <div className="analytics-dashboard-container">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Global Filter Bar */}
      <AnalyticsFilters
        rangePreset={rangePreset}
        setRangePreset={setRangePreset}
        customFrom={customFrom}
        setCustomFrom={setCustomFrom}
        customTo={customTo}
        setCustomTo={setCustomTo}
        selectedDomain={selectedDomain}
        setSelectedDomain={setSelectedDomain}
        selectedTeamLeader={selectedTeamLeader}
        setSelectedTeamLeader={setSelectedTeamLeader}
        teamLeadersList={teamLeadersList}
        onRefresh={refreshAll}
        lastUpdated={lastUpdated}
        onExportFull={() => triggerExport('overview')}
      />

      {/* Top Row: KPI Cards */}
      <KpiCards
        data={widgets.overview.data}
        loading={widgets.overview.loading}
        error={widgets.overview.error}
        onRetry={() => fetchWidget('overview')}
      />

      {/* Turnaround Stage Latency Metrics */}
      <TurnaroundCard
        data={widgets.turnaround.data}
        loading={widgets.turnaround.loading}
        error={widgets.turnaround.error}
        onRetry={() => fetchWidget('turnaround')}
        onExport={triggerExport}
      />

      {/* Charts Grid 1: Requests Trend & Pipeline */}
      <div className="analytics-charts-grid-2">
        <RequestsTrendChart
          data={widgets.trend.data}
          loading={widgets.trend.loading}
          error={widgets.trend.error}
          onRetry={() => fetchWidget('trend')}
          onExport={triggerExport}
          onSegmentClick={(status) => setFilteredStatusModal(status)}
        />

        <PipelineChart
          data={widgets.pipeline.data}
          loading={widgets.pipeline.loading}
          error={widgets.pipeline.error}
          onRetry={() => fetchWidget('pipeline')}
          onExport={triggerExport}
          onStageClick={(status) => setFilteredStatusModal(status)}
        />
      </div>

      {/* Charts Grid 2: Certificate Types Donut & Interns per Domain */}
      <div className="analytics-charts-grid-2">
        <CertificateTypesChart
          data={widgets.types.data}
          loading={widgets.types.loading}
          error={widgets.types.error}
          onRetry={() => fetchWidget('types')}
          onExport={triggerExport}
        />

        <DomainsChart
          data={widgets.domains.data}
          loading={widgets.domains.loading}
          error={widgets.domains.error}
          onRetry={() => fetchWidget('domains')}
          onExport={triggerExport}
        />
      </div>

      {/* Tables Row 1: Team Leader Performance */}
      <TeamLeaderPerformanceTable
        data={widgets.teamLeaders.data}
        loading={widgets.teamLeaders.loading}
        error={widgets.teamLeaders.error}
        onRetry={() => fetchWidget('teamLeaders')}
        onExport={triggerExport}
      />

      {/* Tables Row 2: Overdue / Stuck Requests */}
      <StuckRequestsTable
        data={widgets.stuck.data}
        loading={widgets.stuck.loading}
        error={widgets.stuck.error}
        onRetry={() => fetchWidget('stuck')}
        onExport={triggerExport}
      />

      {/* Tables Row 3: Upcoming Completions */}
      <UpcomingCompletionsTable
        data={widgets.completions.data}
        loading={widgets.completions.loading}
        error={widgets.completions.error}
        upcomingDays={upcomingDays}
        setUpcomingDays={setUpcomingDays}
        onRetry={() => fetchWidget('completions')}
        onExport={triggerExport}
      />

      {/* Filtered Requests Drill-down Modal */}
      {filteredStatusModal && (
        <FilteredRequestsModal
          status={filteredStatusModal}
          onClose={() => setFilteredStatusModal(null)}
        />
      )}
    </div>
  );
}
