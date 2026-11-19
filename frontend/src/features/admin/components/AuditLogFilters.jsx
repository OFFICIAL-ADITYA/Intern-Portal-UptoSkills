import { useState, useEffect } from 'react';
import './AuditLogFilters.css';

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  {
    label: 'Authentication',
    options: [
      { value: 'LOGIN', label: 'LOGIN' },
      { value: 'LOGIN_FAILED', label: 'LOGIN_FAILED' },
      { value: 'LOGOUT', label: 'LOGOUT' },
      { value: 'PASSWORD_RESET_REQUESTED', label: 'PASSWORD_RESET_REQUESTED' },
      { value: 'PASSWORD_RESET_COMPLETED', label: 'PASSWORD_RESET_COMPLETED' }
    ]
  },
  {
    label: 'User Management',
    options: [
      { value: 'USER_CREATED', label: 'USER_CREATED' }
    ]
  },
  {
    label: 'Certificate Requests',
    options: [
      { value: 'REQUEST_SUBMITTED', label: 'REQUEST_SUBMITTED' },
      { value: 'REQUEST_FORWARDED', label: 'REQUEST_FORWARDED' },
      { value: 'REQUEST_APPROVED', label: 'REQUEST_APPROVED' },
      { value: 'REQUEST_REJECTED', label: 'REQUEST_REJECTED' }
    ]
  },
  {
    label: 'Certificates',
    options: [
      { value: 'CERTIFICATE_DRAFT_CREATED', label: 'CERTIFICATE_DRAFT_CREATED' },
      { value: 'CERTIFICATE_EDITED', label: 'CERTIFICATE_EDITED' },
      { value: 'CERTIFICATE_FINALIZED', label: 'CERTIFICATE_FINALIZED' },
      { value: 'CERTIFICATE_REVOKED', label: 'CERTIFICATE_REVOKED' }
    ]
  },
  {
    label: 'Templates',
    options: [
      { value: 'TEMPLATE_CREATED', label: 'TEMPLATE_CREATED' },
      { value: 'TEMPLATE_UPDATED', label: 'TEMPLATE_UPDATED' },
      { value: 'TEMPLATE_TOGGLED', label: 'TEMPLATE_TOGGLED' }
    ]
  },
  {
    label: 'Retention & Jobs',
    options: [
      { value: 'RETENTION_POLICY_UPDATED', label: 'RETENTION_POLICY_UPDATED' },
      { value: 'INTERN_ARCHIVED', label: 'INTERN_ARCHIVED' },
      { value: 'INTERN_PURGED', label: 'INTERN_PURGED' },
      { value: 'INTERN_RESTORED', label: 'INTERN_RESTORED' }
    ]
  },
  {
    label: 'Exports',
    options: [
      { value: 'EXPORT', label: 'EXPORT' }
    ]
  }
];

const TARGET_TYPES = [
  { value: '', label: 'All Target Types' },
  { value: 'user', label: 'User' },
  { value: 'certificate_request', label: 'Certificate Request' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'certificate_template', label: 'Template' },
  { value: 'retention_policy', label: 'Retention Policy' },
  { value: 'audit_logs', label: 'Audit Logs' }
];

export default function AuditLogFilters({ filters, onFilterChange, onReset }) {
  const [activePreset, setActivePreset] = useState('all');
  const [actor, setActor] = useState(filters.actor || '');
  const [action, setAction] = useState(filters.action || '');
  const [targetType, setTargetType] = useState(filters.targetType || '');
  const [from, setFrom] = useState(filters.from || '');
  const [to, setTo] = useState(filters.to || '');

  useEffect(() => {
    setActor(filters.actor || '');
    setAction(filters.action || '');
    setTargetType(filters.targetType || '');
    setFrom(filters.from || '');
    setTo(filters.to || '');
  }, [filters]);

  const applyPreset = (preset) => {
    setActivePreset(preset);
    const now = new Date();
    let newFrom = '';
    let newTo = '';

    if (preset === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      newFrom = today.toISOString().slice(0, 10);
      newTo = now.toISOString().slice(0, 10);
    } else if (preset === '7days') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      newFrom = past.toISOString().slice(0, 10);
      newTo = now.toISOString().slice(0, 10);
    } else if (preset === '30days') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      newFrom = past.toISOString().slice(0, 10);
      newTo = now.toISOString().slice(0, 10);
    } else if (preset === 'all') {
      newFrom = '';
      newTo = '';
    }

    setFrom(newFrom);
    setTo(newTo);
    onFilterChange({ from: newFrom, to: newTo });
  };

  const handleActorSubmit = (e) => {
    if (e.key === 'Enter') {
      onFilterChange({ actor });
    }
  };

  const handleReset = () => {
    setActivePreset('all');
    setActor('');
    setAction('');
    setTargetType('');
    setFrom('');
    setTo('');
    if (onReset) onReset();
    else onFilterChange({ actor: '', action: '', targetType: '', from: '', to: '' });
  };

  return (
    <div className="audit-filters-container">
      {/* Date Presets */}
      <div className="audit-date-presets" role="group" aria-label="Date range presets">
        <button
          type="button"
          className={`audit-preset-btn ${activePreset === 'all' ? 'active' : ''}`}
          onClick={() => applyPreset('all')}
        >
          All Time
        </button>
        <button
          type="button"
          className={`audit-preset-btn ${activePreset === 'today' ? 'active' : ''}`}
          onClick={() => applyPreset('today')}
        >
          Today
        </button>
        <button
          type="button"
          className={`audit-preset-btn ${activePreset === '7days' ? 'active' : ''}`}
          onClick={() => applyPreset('7days')}
        >
          Last 7 Days
        </button>
        <button
          type="button"
          className={`audit-preset-btn ${activePreset === '30days' ? 'active' : ''}`}
          onClick={() => applyPreset('30days')}
        >
          Last 30 Days
        </button>
        <button
          type="button"
          className={`audit-preset-btn ${activePreset === 'custom' ? 'active' : ''}`}
          onClick={() => setActivePreset('custom')}
        >
          Custom
        </button>
      </div>

      <div className="audit-filter-inputs-grid">
        {/* Actor Input */}
        <div className="audit-filter-field">
          <label htmlFor="audit-actor-input">Actor</label>
          <input
            id="audit-actor-input"
            type="text"
            className="audit-input"
            placeholder="Search by name, email or role..."
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            onBlur={() => onFilterChange({ actor })}
            onKeyDown={handleActorSubmit}
          />
        </div>

        {/* Action Select */}
        <div className="audit-filter-field">
          <label htmlFor="audit-action-select">Action</label>
          <select
            id="audit-action-select"
            className="audit-select"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              onFilterChange({ action: e.target.value });
            }}
          >
            {ACTION_OPTIONS.map((group, idx) =>
              group.options ? (
                <optgroup key={idx} label={group.label}>
                  {group.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
              ) : (
                <option key={group.value} value={group.value}>
                  {group.label}
                </option>
              )
            )}
          </select>
        </div>

        {/* Target Type Select */}
        <div className="audit-filter-field">
          <label htmlFor="audit-target-select">Target Type</label>
          <select
            id="audit-target-select"
            className="audit-select"
            value={targetType}
            onChange={(e) => {
              setTargetType(e.target.value);
              onFilterChange({ targetType: e.target.value });
            }}
          >
            {TARGET_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Date Pickers */}
        {activePreset === 'custom' && (
          <>
            <div className="audit-filter-field">
              <label htmlFor="audit-from-date">From</label>
              <input
                id="audit-from-date"
                type="date"
                className="audit-input"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  onFilterChange({ from: e.target.value });
                }}
              />
            </div>
            <div className="audit-filter-field">
              <label htmlFor="audit-to-date">To</label>
              <input
                id="audit-to-date"
                type="date"
                className="audit-input"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  onFilterChange({ to: e.target.value });
                }}
              />
            </div>
          </>
        )}

        {/* Reset Button */}
        <div className="audit-filter-actions">
          <button type="button" className="audit-reset-btn" onClick={handleReset}>
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  );
}
