import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import CreateIntern from "../components/CreateIntern";
import MyInternsList from "../components/MyInternsList";
import PendingReviewList from "../components/PendingReviewList";
import TeamLeaderNotifications from "../components/TeamLeaderNotifications";
import NotificationBell from "../../../shared/components/NotificationBell";
import {
  BrandLogo,
  LogoutIcon,
  HomeIcon,
  CertificateIcon,
  UsersIcon,
  UserIcon,
  UserPlusIcon,
  CheckCircleIcon
} from "../../../shared/components/Icons";
import "./TLDashboard.css";

const TLDashboard = () => {
  const { user, handleLogout } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("overview");

  const initials = (user?.fullName || "Team Leader")
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
          <span className="tl-portal-badge">TEAM SUPERVISOR</span>
        </div>
        <div className="admin-topbar-user">
          <NotificationBell onNavigateByRole={() => setActiveView("requests")} />
          <div className="admin-user-pill">
            <div className="admin-avatar">{initials}</div>
            <div className="admin-user-meta">
              <strong>{user?.fullName || "Team Leader"}</strong>
              <small>{user?.email || "Loading profile..."}</small>
            </div>
          </div>
          <button className="admin-logout" onClick={logout} title="Sign out" aria-label="Sign out">
            <span><LogoutIcon size={16} /></span>
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </header>

      <aside className="admin-sidebar" aria-label="Team leader navigation">
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
          <p className="admin-sidebar-label">Team Supervision</p>
          <nav className="admin-sidebar-nav">
            <button
              className={`admin-nav-item ${activeView === "requests" ? "active" : ""}`}
              onClick={() => setActiveView("requests")}
            >
              <span><CertificateIcon size={18} /></span> Certificate Requests
            </button>
            <button
              className={`admin-nav-item ${activeView === "myInterns" ? "active" : ""}`}
              onClick={() => setActiveView("myInterns")}
            >
              <span><UsersIcon size={18} /></span> My Interns
            </button>
            <button
              className={`admin-nav-item ${activeView === "intern" ? "active" : ""}`}
              onClick={() => setActiveView("intern")}
            >
              <span><UserPlusIcon size={18} /></span> Create Intern
            </button>
          </nav>
        </div>

        <div className="admin-sidebar-note">
          <span className="admin-beacon" aria-hidden="true"></span>
          <span>Supervisor Active • Team Leader</span>
        </div>
      </aside>

      <main className="admin-dashboard-main">
        <header className="admin-page-header">
          <p className="admin-eyebrow">TEAM LEADER</p>
          <h1>
            {activeView === "overview"
              ? "Welcome back"
              : activeView === "requests"
                ? "Certificate requests"
                : activeView === "myInterns"
                  ? "My interns"
                  : "Create an intern"}
          </h1>
          <p>
            {activeView === "overview"
              ? "Manage your team from one secure workspace."
              : activeView === "requests"
                ? "Review intern requests waiting for your decision."
                : activeView === "myInterns"
                  ? "View the interns assigned to your team."
                  : "Complete the details below to create an intern account."}
          </p>
        </header>

        {activeView === "overview" ? (
          <>
            <section
              className="admin-profile-card"
              aria-label="Team leader profile"
            >
              <div className="admin-profile-heading">
                <div className="admin-profile-avatar">{initials}</div>
                <div>
                  <p className="admin-eyebrow">YOUR PROFILE</p>
                  <h2>{user?.fullName || "Team Leader"}</h2>
                  <p>{user?.email || "Loading profile..."}</p>
                </div>
              </div>
              <div className="admin-profile-details">
                <div>
                  <span>Role</span>
                  <strong>{user?.role || "teamleader"}</strong>
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
                <button onClick={() => setActiveView("intern")} className="qa-btn qa-orange">
                  <div className="qa-icon-wrap"><UserPlusIcon size={20} /></div>
                  <div className="qa-text">
                    <strong>Create Intern</strong>
                    <small>Enroll a new intern into your team</small>
                  </div>
                </button>
                <button onClick={() => setActiveView("requests")} className="qa-btn qa-teal">
                  <div className="qa-icon-wrap"><CertificateIcon size={20} /></div>
                  <div className="qa-text">
                    <strong>Review Requests</strong>
                    <small>Evaluate pending certificate applications</small>
                  </div>
                </button>
                <button onClick={() => setActiveView("myInterns")} className="qa-btn qa-blue">
                  <div className="qa-icon-wrap"><UsersIcon size={20} /></div>
                  <div className="qa-text">
                    <strong>My Team Directory</strong>
                    <small>Monitor active interns in your cohort</small>
                  </div>
                </button>
              </div>
            </section>
            <TeamLeaderNotifications />
          </>
        ) : activeView === "requests" ? (
          <PendingReviewList />
        ) : activeView === "myInterns" ? (
          <MyInternsList />
        ) : (
          <div className="teamleader-form-grid">
            <CreateIntern />
          </div>
        )}
      </main>
    </div>
  );
};

export default TLDashboard;
