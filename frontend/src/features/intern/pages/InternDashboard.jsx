import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIntern } from '../hooks/useIntern';
import { useAuth } from '../../auth/hooks/useAuth';
import RequestCertificateModal from '../components/RequestCertificateModal';
import MyRequestsList from '../components/MyRequestsList';
import SettingsPage from './SettingsPage';
import NotificationBell from '../../../shared/components/NotificationBell';
import ChatWidget from '../components/ChatWidget';
import {
  BrandLogo,
  HomeIcon,
  CertificateIcon,
  SettingsIcon,
  LogoutIcon,
  AlertTriangleIcon,
  MailIcon,
  LockIcon,
  UsersIcon,
  ShieldIcon,
  CheckCircleIcon,
  CalendarIcon,
  ClockIcon,
  ChartBarIcon,
  ArrowRightIcon,
  SparklesIcon
} from '../../../shared/components/Icons';
import './InternDashboard.css';
import '../../../app/App.css';

/* ── helpers ── */
const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getInitials = (name = '') =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const calcProgress = (start, end) => {
  const now = Date.now();
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (!s || !e || e <= s) return 0;
  const pct = ((now - s) / (e - s)) * 100;
  return Math.min(Math.max(Math.round(pct), 0), 100);
};

const calcDaysLeft = (end) => {
  if (!end) return '—';
  const diff = Math.ceil((new Date(end).getTime() - Date.now()) / 86_400_000);
  return diff > 0 ? diff : 0;
};

/* ── nav items ── */
const NAV_ITEMS = [
  { icon: <HomeIcon size={18} />, label: 'Dashboard', id: 'dashboard' },
  { icon: <CertificateIcon size={18} />, label: 'Certificates', id: 'certificates' },
  { icon: <SettingsIcon size={18} />, label: 'Settings', id: 'settings' },
];

/* ============================================================
   InternDashboard
   ============================================================ */
export default function InternDashboard() {
  const { profile, loading, error, fetchProfile } = useIntern();
  const { handleLogout } = useAuth();
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('dashboard');
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  const onLogout = () => {
    handleLogout();
    navigate('/login');
  };

  /* ── derived ── */
  const initials = profile ? getInitials(profile.fullName) : '?';
  const progress = profile
    ? calcProgress(profile.startDate, profile.endDate)
    : 0;
  const daysLeft = profile ? calcDaysLeft(profile.endDate) : '—';

  /* ── render ── */
  return (
    <div className="intern-dashboard-page">
      {/* ─── Top Navbar ─── */}
      <nav className="id-navbar">
        <div className="id-brand">
          <BrandLogo height={32} />
          <span className="id-portal-badge">INTERN PORTAL</span>
        </div>

        <div className="id-nav-right">
          <NotificationBell onNavigateByRole={() => setActiveNav('certificates')} />
          <div className="id-user-pill">
            <div className="id-avatar" aria-label="User avatar">
              {initials}
            </div>
            <div className="id-user-info">
              <strong>{profile?.fullName ?? 'Loading…'}</strong>
              <small>{profile?.email ?? ''}</small>
            </div>
          </div>

          <button
            id="intern-logout-btn"
            className="id-logout-btn"
            onClick={onLogout}
            title="Sign out"
            aria-label="Sign out"
          >
            <span><LogoutIcon size={16} /></span>
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </nav>

      {/* ─── Sidebar ─── */}
      <aside className="id-sidebar" role="navigation" aria-label="Sidebar">
        <p className="id-sidebar-label">Main Menu</p>
        <nav className="id-sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              id={`sidebar-nav-${item.id}`}
              className={`id-nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              <span className="id-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="id-main">
        {/* Page header */}
        <header className="id-page-header">
          <h1 className="id-greeting">
            Hello,{' '}
            <em>{profile?.fullName ?? '…'}</em>
          </h1>
          <p className="id-subtext">
            Here's your internship overview for today.
          </p>
        </header>

        {/* ── Archival Warning Banner (7 days before archival) ── */}
        {profile?.isArchivalWarning && (
          <aside className="intern-archival-warning-banner" role="alert" aria-live="polite">
            <div className="id-warning-banner-icon">
              <AlertTriangleIcon size={20} />
            </div>
            <div className="id-warning-banner-content">
              <h4>Account Archival Notice</h4>
              <p>
                Your internship has ended and your account is scheduled to be archived in{' '}
                <strong>
                  {profile.daysUntilArchival} {profile.daysUntilArchival === 1 ? 'day' : 'days'}
                </strong>{' '}
                (on {formatDate(profile.archivalDate)}). Once archived, login access will be restricted.
                Please ensure you have requested and downloaded all necessary certificates.
              </p>
            </div>
          </aside>
        )}

        {activeNav === 'certificates' && (
          <>
            <section className="certificate-actions" aria-label="Certificate requests">
              <div><p className="request-eyebrow">CERTIFICATE DESK</p><h2>Request a certificate</h2><p>Choose a certificate and follow its progress here.</p></div>
              <button type="button" className="request-primary-button" onClick={() => setShowCertificateModal(true)}>Request certificate</button>
            </section>
            <MyRequestsList />
          </>
        )}

        {activeNav === 'settings' && (
          <SettingsPage profile={profile} onProfileUpdated={fetchProfile} />
        )}

        {/* ── Loading state ── */}
        {activeNav === 'dashboard' && loading && (
          <div className="id-loading" role="status" aria-live="polite">
            <div className="id-spinner" aria-hidden="true" />
            <span>Loading your profile…</span>
          </div>
        )}

        {/* ── Error state ── */}
        {activeNav === 'dashboard' && !loading && error && (
          <div className="id-error" role="alert">
            <span className="id-error-icon">
              <AlertTriangleIcon size={18} />
            </span>
            <span>{error}</span>
            <button
              id="retry-profile-btn"
              className="id-retry-btn"
              onClick={fetchProfile}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Profile data ── */}
        {activeNav === 'dashboard' && !loading && !error && profile && (
          <>
            {/* Profile Card */}
            <section className="id-profile-card" aria-label="Profile details">
              <div className="id-profile-header">
                <div className="id-profile-avatar" aria-hidden="true">
                  {initials}
                </div>
                <div className="id-profile-identity">
                  <h2 className="id-profile-name">{profile.fullName}</h2>
                  <p className="id-profile-email">
                    <MailIcon size={14} /> {profile.email}
                  </p>
                  <div className="id-badge-row">
                    <span className="id-badge id-badge-code">
                      <LockIcon size={13} /> {profile.internCode}
                    </span>
                    <span className="id-badge id-badge-domain">
                      <UsersIcon size={13} /> {profile.domain}
                    </span>
                    <span className="id-badge id-badge-role">
                      <ShieldIcon size={13} /> {profile.role}
                    </span>
                    <span className="id-badge id-badge-active">
                      <CheckCircleIcon size={13} /> Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Detail grid */}
              <div className="id-detail-grid">
                <div className="id-detail-item">
                  <div className="id-detail-label">Mobile</div>
                  <div className="id-detail-value">{profile.mobileNo}</div>
                </div>

                <div className="id-detail-item">
                  <div className="id-detail-label">Intern Code</div>
                  <div className="id-detail-value">{profile.internCode}</div>
                </div>

                <div className="id-detail-item">
                  <div className="id-detail-label">Domain</div>
                  <div className="id-detail-value">{profile.domain}</div>
                </div>

                <div className="id-detail-item">
                  <div className="id-detail-label">Member Since</div>
                  <div className="id-detail-value">
                    {formatDate(profile.createdAt)}
                  </div>
                </div>
              </div>
            </section>

            {/* Internship Timeline */}
            <section aria-label="Internship timeline">
              <h3 className="id-section-title">
                <CalendarIcon size={18} /> Internship Timeline
              </h3>
              <div className="id-timeline-card">
                <div className="id-date-row">
                  <div className="id-date-block start">
                    <div className="id-date-label">Start Date</div>
                    <div className="id-date-value">
                      {formatDate(profile.startDate)}
                    </div>
                  </div>

                  <div className="id-arrow" aria-hidden="true">
                    <ArrowRightIcon size={18} />
                  </div>

                  <div className="id-date-block end">
                    <div className="id-date-label">End Date</div>
                    <div className="id-date-value">
                      {formatDate(profile.endDate)}
                    </div>
                  </div>
                </div>

                <div className="id-progress-wrapper">
                  <div className="id-progress-label">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div
                    className="id-progress-track"
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="id-progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Stat Grid */}
            <div className="id-stat-grid" aria-label="Quick stats">
              <div className="id-stat-card">
                <div className="id-stat-icon accent">
                  <ShieldIcon size={20} />
                </div>
                <div className="id-stat-label">Role</div>
                <div className="id-stat-value accent">{profile.role}</div>
              </div>

              <div className="id-stat-card">
                <div className="id-stat-icon success">
                  <UsersIcon size={20} />
                </div>
                <div className="id-stat-label">Domain</div>
                <div className="id-stat-value success">{profile.domain}</div>
              </div>

              <div className="id-stat-card">
                <div className="id-stat-icon warning">
                  <ClockIcon size={20} />
                </div>
                <div className="id-stat-label">Days Remaining</div>
                <div className="id-stat-value warning">{daysLeft}</div>
              </div>

              <div className="id-stat-card">
                <div className="id-stat-icon info">
                  <ChartBarIcon size={20} />
                </div>
                <div className="id-stat-label">Completion</div>
                <div className="id-stat-value info">{progress}%</div>
              </div>
            </div>

          </>
        )}
      </main>
      {/* ─── Mobile Bottom Navigation Dock (<= 768px) ─── */}
      <nav className="id-mobile-nav" aria-label="Mobile navigation">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            id={`mobile-nav-${item.id}`}
            className={`id-mobile-nav-item ${activeNav === item.id ? 'active' : ''}`}
            onClick={() => setActiveNav(item.id)}
            type="button"
          >
            <span className="id-mobile-nav-icon">{item.icon}</span>
            <span className="id-mobile-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {showCertificateModal && <RequestCertificateModal onClose={() => setShowCertificateModal(false)} />}
      <ChatWidget />
    </div>
  );
}