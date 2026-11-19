import { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../features/shared/components/ProtectedRoute";
import ThemeToggle from "../features/shared/components/ThemeToggle";
import Loading from "../features/shared/components/Loading";
import ErrorBoundary from "../shared/components/ErrorBoundary";
import "./App.css";

// Task K: Lazy-load route pages with React.lazy to eliminate heavy chunks (GrapesJS, Recharts) from initial load
const Login = lazy(() => import("../features/auth/pages/Login"));
const ForgotPasswordPage = lazy(() => import("../features/auth/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("../features/auth/pages/ResetPasswordPage"));
const InternDashboard = lazy(() => import("../features/intern/pages/InternDashboard"));
const TLDashboard = lazy(() => import("../features/teamleader/pages/TLDashboard"));
const AdminDashboard = lazy(() => import("../features/admin/pages/AdminDashboard"));
const CertificateReviewPage = lazy(() => import("../features/admin/pages/CertificateReviewPage"));
const VerifyPage = lazy(() => import("../features/public/pages/VerifyPage"));
const AccessDeniedPage = lazy(() => import("../shared/components/AccessDeniedPage"));

export default function App() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "dark",
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
  };

  return (
    <ErrorBoundary>
      <ThemeToggle theme={theme} onToggle={toggleTheme} />

      <Suspense fallback={<Loading message="Loading portal..." />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/verify/:verifyId" element={<VerifyPage />} />
          <Route path="/access-denied" element={<AccessDeniedPage />} />
          <Route path="/unauthorized" element={<Navigate to="/access-denied" replace />} />

          <Route element={<ProtectedRoute allowedRoles={["intern"]} />}>
            <Route path="/intern/dashboard" element={<InternDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["teamleader"]} />}>
            <Route path="/teamleader/dashboard" element={<TLDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route
              path="/admin/certificates/:id"
              element={<CertificateReviewPage />}
            />
            <Route
              path="/admin/audit-logs"
              element={<AdminDashboard initialView="audit-logs" />}
            />
            <Route
              path="/admin/analytics"
              element={<AdminDashboard initialView="analytics" />}
            />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
