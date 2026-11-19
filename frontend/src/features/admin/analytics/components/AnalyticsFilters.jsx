import { RefreshIcon, DownloadIcon } from '../../../../shared/components/Icons';

export default function AnalyticsFilters({
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
  teamLeadersList,
  onRefresh,
  lastUpdated,
  onExportFull,
}) {
  return (
    <div className="analytics-controls-bar">
      <div className="analytics-controls-left">
        {/* Date presets */}
        <div className="analytics-pill-group" role="group" aria-label="Date range selector">
          {[
            { id: '7d', label: '7 Days' },
            { id: '30d', label: '30 Days' },
            { id: '6m', label: '6 Months' },
            { id: 'custom', label: 'Custom' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              className={`analytics-pill-btn ${rangePreset === p.id ? 'active' : ''}`}
              onClick={() => setRangePreset(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date range inputs */}
        {rangePreset === 'custom' && (
          <div className="analytics-custom-dates">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              placeholder="From"
              aria-label="Filter from date"
            />
            <span>to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              placeholder="To"
              aria-label="Filter to date"
            />
          </div>
        )}

        {/* Domain Filter */}
        <select
          value={selectedDomain}
          onChange={(e) => setSelectedDomain(e.target.value)}
          className="analytics-select"
          aria-label="Filter by Domain"
        >
          <option value="">All Domains</option>
          <option value="Web Development">Web Development</option>
          <option value="Data Science">Data Science</option>
          <option value="UI/UX Design">UI/UX Design</option>
          <option value="DevOps">DevOps</option>
          <option value="Mobile Development">Mobile Development</option>
        </select>

        {/* Team Leader Filter */}
        <select
          value={selectedTeamLeader}
          onChange={(e) => setSelectedTeamLeader(e.target.value)}
          className="analytics-select"
          aria-label="Filter by Team Leader"
        >
          <option value="">All Team Leaders</option>
          {teamLeadersList.map((tl) => (
            <option key={tl._id || tl.id} value={tl._id || tl.id}>
              {tl.fullName} ({tl.email})
            </option>
          ))}
        </select>
      </div>

      <div className="analytics-controls-right">
        {lastUpdated && (
          <span className="analytics-last-updated">
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}

        <button type="button" className="analytics-control-btn refresh" onClick={onRefresh} title="Refresh analytics data">
          <RefreshIcon size={14} /> Refresh
        </button>

        <button type="button" className="analytics-control-btn export-full" onClick={onExportFull} title="Export full report as CSV">
          <DownloadIcon size={14} /> Export Full Report
        </button>
      </div>
    </div>
  );
}
