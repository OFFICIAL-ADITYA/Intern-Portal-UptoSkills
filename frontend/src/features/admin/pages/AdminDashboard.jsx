import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import CreateIntern from "../components/CreateIntern";
import CreateTl from "../components/CreateTl";
import ForwardedRequestsList from "../components/ForwardedRequestsList";
import TeamLeadersSection from "../components/TeamLeadersSection";
import TemplatesSection from "../components/TemplatesSection";
import CertificatesOverview from "../components/CertificatesOverview";
import AdminAnalytics from "./AdminAnalytics";

import RetentionPolicyForm from "../components/RetentionPolicyForm";
import ArchivedInternsList from "../components/ArchivedInternsList";
import AuditLogsPage from "./AuditLogsPage";
import NotificationBell from "../../../shared/components/NotificationBell";
import {
  BrandLogo,
  LogoutIcon,
  HomeIcon,
  UserIcon,
  UsersIcon,
  UserPlusIcon,
  CertificateIcon,
  FileTextIcon,
  ChartBarIcon,
  ClockIcon,
  ShieldIcon,
  SparklesIcon,
  TrendingUpIcon
} from "../../../shared/components/Icons";

import "./AdminDashboard.css";

const AdminDashboard = ({ initialView }) => {
  const { user, handleLogout } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState(initialView || "overview");

  const initials = (user?.fullName || "Admin")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const logout = () => {
    handleLogout();
    navigate("/login");
  };

  return (
    <div className="admin-dashboard-shell">
      <header className="admin-topbar">
        <div className="admin-brand">
          <BrandLogo height={32} />
          <span className="admin-portal-badge">ADMIN CONSOLE</span>
        </div>
        <div className="admin-topbar-user">
          <NotificationBell onNavigateByRole={() => setActiveView("requests")} />
          <div className="admin-user-pill">
            <div className="admin-avatar">{initials}</div>
            <div className="admin-user-meta">
              <strong>{user?.fullName || "Administrator"}</strong>
              <small>{user?.email || "Loading profile..."}</small>
            </div>
          </div>
          <button className="admin-logout" onClick={logout} title="Sign out" aria-label="Sign out">
            <span><LogoutIcon size={16} /></span>
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </header>

      <aside className="admin-sidebar" aria-label="Admin navigation">
        <div className="admin-sidebar-section">
          <p className="admin-sidebar-label">Main Workspace</p>
          <nav className="admin-sidebar-nav">
            <button
              className={`admin-nav-item ${activeView === "overview" ? "active" : ""}`}
              onClick={() => setActiveView("overview")}
            >
              <span><HomeIcon size={18} /></span> Overview
            </button>
          </nav>
        </div>

        <div className="admin-sidebar-section">
          <p className="admin-sidebar-label">Directory</p>
          <nav className="admin-sidebar-nav">
            <button
              className={`admin-nav-item ${activeView === "intern" ? "active" : ""}`}
              onClick={() => setActiveView("intern")}
            >
              <span><UserPlusIcon size={18} /></span> Create Intern
            </button>
            <button
              className={`admin-nav-item ${activeView === "teamleader" ? "active" : ""}`}
              onClick={() => setActiveView("teamleader")}
            >
              <span><UsersIcon size={18} /></span> Create Team Leader
            </button>
          </nav>
        </div>

        <div className="admin-sidebar-section">
          <p className="admin-sidebar-label">Certificates</p>
          <nav className="admin-sidebar-nav">
            <button
              className={`admin-nav-item ${activeView === "requests" ? "active" : ""}`}
              onClick={() => setActiveView("requests")}
            >
              <span><CertificateIcon size={18} /></span> Certificate Requests
            </button>
            <button
              className={`admin-nav-item ${activeView === "certificates" ? "active" : ""}`}
              onClick={() => setActiveView("certificates")}
            >
              <span><FileTextIcon size={18} /></span> Certificates
            </button>
            <button
              className={`admin-nav-item ${activeView === "templates" ? "active" : ""}`}
              onClick={() => setActiveView("templates")}
            >
              <span><SparklesIcon size={18} /></span> Templates
            </button>
          </nav>
        </div>

        <div className="admin-sidebar-section">
          <p className="admin-sidebar-label">Operations</p>
          <nav className="admin-sidebar-nav">
            <button
              className={`admin-nav-item ${activeView === "analytics" ? "active" : ""}`}
              onClick={() => setActiveView("analytics")}
            >
              <span><ChartBarIcon size={18} /></span> Analytics
            </button>
            <button
              className={`admin-nav-item ${activeView === "retention" ? "active" : ""}`}
              onClick={() => setActiveView("retention")}
            >
              <span><ClockIcon size={18} /></span> Retention & Archival
            </button>
            <button
              className={`admin-nav-item ${activeView === "audit-logs" ? "active" : ""}`}
              onClick={() => setActiveView("audit-logs")}
            >
              <span><ShieldIcon size={18} /></span> Audit Logs
            </button>
          </nav>
        </div>

        <div className="admin-sidebar-note">
          <span className="admin-beacon" aria-hidden="true"></span>
          <span>System Active • Admin Access</span>
        </div>
      </aside>

      <main className="admin-dashboard-main">
        <header className="admin-page-header">
          <p className="admin-eyebrow">ADMINISTRATION</p>
          <h1>
            {activeView === "overview"
              ? "Welcome back"
              : activeView === "intern"
                ? "Create an intern"
                : activeView === "teamleader"
                  ? "Create a team leader"
                  : activeView === "requests"
                    ? "Certificate requests"
                    : activeView === "certificates"
                      ? "Certificates"
                      : activeView === "templates"
                        ? "Certificate templates"
                        : activeView === "analytics"
                          ? "Admin analytics"
                          : activeView === "retention"
                            ? "Intern Retention & Archival"
                            : "Certificate review"}
          </h1>
          <p>
            {activeView === "overview"
              ? "Manage your portal accounts from one secure workspace."
              : activeView === "requests"
                ? "Finalize certificate requests forwarded by Team Leaders."
                : activeView === "certificates"
                  ? "View, review, and manage generated certificates."
                  : activeView === "templates"
                    ? "Create and manage certificate templates."
                    : activeView === "intern"
                      ? "Create a new intern account."
                      : activeView === "teamleader"
                        ? "Create a new team leader account."
                        : activeView === "analytics"
                          ? "Monitor internship performance, certificate requests, team activity, and operational insights."
                          : activeView === "retention"
                            ? "Configure automated retention policies and manage archived intern accounts."
                            : "Review, edit and finalize the certificate before sending it to the intern."}
          </p>
        </header>

        {activeView === "overview" ? (
          <>
            <section
              className="admin-profile-card"
              aria-label="Administrator profile"
            >
              <div className="admin-profile-heading">
                <div className="admin-profile-avatar">{initials}</div>
                <div>
                  <p className="admin-eyebrow">YOUR PROFILE</p>
                  <h2>{user?.fullName || "Administrator"}</h2>
                  <p>{user?.email || "Loading profile..."}</p>
                </div>
              </div>
              <div className="admin-profile-details">
                <div>
                  <span>Role</span>
                  <strong>{user?.role || "admin"}</strong>
                </div>
                <div>
                  <span>Mobile number</span>
                  <strong>{user?.mobileNo || "Not provided"}</strong>
                </div>
                <div>
                  <span>Member since</span>
                  <strong>
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </strong>
                </div>
              </div>
              <div className="admin-quick-actions">
                <button onClick={() => setActiveView("intern")} className="qa-btn qa-teal">
                  <div className="qa-icon-wrap"><UserPlusIcon size={20} /></div>
                  <div className="qa-text">
                    <strong>Create Intern</strong>
                    <small>Register & enroll a new intern</small>
                  </div>
                </button>
                <button onClick={() => setActiveView("teamleader")} className="qa-btn qa-orange">
                  <div className="qa-icon-wrap"><UsersIcon size={20} /></div>
                  <div className="qa-text">
                    <strong>Create Team Leader</strong>
                    <small>Add supervisor to manage cohorts</small>
                  </div>
                </button>
                <button onClick={() => setActiveView("requests")} className="qa-btn qa-blue">
                  <div className="qa-icon-wrap"><CertificateIcon size={20} /></div>
                  <div className="qa-text">
                    <strong>Certificate Requests</strong>
                    <small>Review & finalize certificates</small>
                  </div>
                </button>
                <button onClick={() => setActiveView("analytics")} className="qa-btn qa-emerald">
                  <div className="qa-icon-wrap"><ChartBarIcon size={20} /></div>
                  <div className="qa-text">
                    <strong>Operations Analytics</strong>
                    <small>Performance & compliance metrics</small>
                  </div>
                </button>
              </div>
            </section>

            <TeamLeadersSection />
          </>
        ) : activeView === "intern" ? (
          <CreateIntern />
        ) : activeView === "teamleader" ? (
          <CreateTl />
        ) : activeView === "requests" ? (
          <ForwardedRequestsList />
        ) : activeView === "templates" ? (
          <TemplatesSection />
        ) : activeView === "certificates" ? (
          <CertificatesOverview />
        ) : activeView === "analytics" ? (
          <AdminAnalytics />
        ) : activeView === "retention" ? (
          <div className="admin-retention-container" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            <RetentionPolicyForm />
            <ArchivedInternsList />
          </div>
        ) : activeView === "audit-logs" ? (
          <AuditLogsPage />
        ) : (
          <CertificatesOverview />
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
