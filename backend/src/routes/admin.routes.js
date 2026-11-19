import express from "express";
import {
  registerValidator,
  teamLeaderValidator,
} from "../validators/auth.validator.js";
import {
  createInternValidator,
  templateValidator,
  analyticsQueryValidator,
} from "../validators/portal.validator.js";
import {
  createIntern,
  createTeamLeader,
  getAllTeamLeaders,
  getInternsByTeamLeader,
  getForwardedRequests,
  finalizeRequest,
  getCertificateDraft,
  updateCertificateDraft,
  finalizeCertificate,
  getAllCertificates,
  retryCertificateGeneration,
  downloadCertificatePdf,
  renderPreviewPdf,
  createTemplate,
  getAllTemplates,
  updateTemplate,
  toggleTemplateActive,
  getTemplatePlaceholders,
  getRetentionPolicy,
  updateRetentionPolicy,
  getArchivedInterns,
  restoreArchivedIntern,
  revokeCertificate,
  unrevokeCertificate,
  getAuditLogs,
  exportAuditLogs,
  getFilteredRequests,
} from "../controllers/admin.controller.js";
import verifyAuth from "../middlewares/verifyAuth.js";
import requireAdmin from "../middlewares/requireAdmin.js";
import {
  getAnalyticsOverview,
  getRequestsTrend,
  getCertificateTypes,
  getTurnaround,
  getTeamLeaderPerformance,
  getDomainAnalytics,
  getAnalyticsPipeline,
  getStuckRequests,
  getUpcomingCompletions,
  exportAnalytics,
} from "../controllers/adminAnalytics.controller.js";

const adminRouter = express.Router();

// POST api/auth/register-intern
adminRouter.post(
  "/create-intern",
  verifyAuth,
  requireAdmin,
  createInternValidator,
  createIntern,
);

// POST api/auth/register-tl
adminRouter.post(
  "/create-tl",
  verifyAuth,
  requireAdmin,
  teamLeaderValidator,
  createTeamLeader,
);

adminRouter.get("/teamleaders", verifyAuth, requireAdmin, getAllTeamLeaders);

adminRouter.get(
  "/teamleaders/:id/interns",
  verifyAuth,
  requireAdmin,
  getInternsByTeamLeader,
);

adminRouter.get(
  "/forwarded-requests",
  verifyAuth,
  requireAdmin,
  getForwardedRequests,
);

adminRouter.patch(
  "/requests/:id/finalize",
  verifyAuth,
  requireAdmin,
  finalizeRequest,
);

// Day 1 Certificate Template routes
adminRouter.post(
  "/templates",
  verifyAuth,
  requireAdmin,
  templateValidator,
  createTemplate
);

adminRouter.get(
  "/templates",
  verifyAuth,
  requireAdmin,
  getAllTemplates
);

adminRouter.get(
  "/templates/placeholders",
  verifyAuth,
  requireAdmin,
  getTemplatePlaceholders
);

adminRouter.patch(
  "/templates/:id",
  verifyAuth,
  requireAdmin,
  updateTemplate
);

adminRouter.patch(
  "/templates/:id/toggle",
  verifyAuth,
  requireAdmin,
  toggleTemplateActive
);

// Day 3 Certificate Draft Review routes
adminRouter.get(
  "/certificates/:id",
  verifyAuth,
  requireAdmin,
  getCertificateDraft,
);
adminRouter.patch(
  "/certificates/:id",
  verifyAuth,
  requireAdmin,
  updateCertificateDraft,
);

// Day 4 Certificate Finalization & Email Delivery route
adminRouter.post(
  "/certificates/:id/finalize",
  verifyAuth,
  requireAdmin,
  finalizeCertificate,
);

// Day 5 Admin Overview, Download & Retry Generation routes
adminRouter.get("/certificates", verifyAuth, requireAdmin, getAllCertificates);
adminRouter.get(
  "/certificates/:id/download",
  verifyAuth,
  requireAdmin,
  downloadCertificatePdf,
);
adminRouter.post(
  "/requests/:id/retry-generation",
  verifyAuth,
  requireAdmin,
  retryCertificateGeneration,
);
adminRouter.post(
  "/render-preview-pdf",
  verifyAuth,
  requireAdmin,
  renderPreviewPdf,
);

// Task F: Certificate Revocation routes
adminRouter.patch(
  "/certificates/:id/revoke",
  verifyAuth,
  requireAdmin,
  revokeCertificate
);
adminRouter.patch(
  "/certificates/:id/unrevoke",
  verifyAuth,
  requireAdmin,
  unrevokeCertificate
);

// Task D: Audit Logs endpoints
adminRouter.get("/audit-logs", verifyAuth, requireAdmin, getAuditLogs);
adminRouter.get("/audit-logs/export", verifyAuth, requireAdmin, exportAuditLogs);

// Task C: Intern Account Lifecycle & Retention routes
adminRouter.get("/retention-policy", verifyAuth, requireAdmin, getRetentionPolicy);
adminRouter.patch("/retention-policy", verifyAuth, requireAdmin, updateRetentionPolicy);
adminRouter.get("/interns/archived", verifyAuth, requireAdmin, getArchivedInterns);
adminRouter.patch("/interns/:id/restore", verifyAuth, requireAdmin, restoreArchivedIntern);


// Task G: Filtered requests list (chart segment drilldown)
adminRouter.get("/requests", verifyAuth, requireAdmin, getFilteredRequests);

// Admin Analytics endpoints. Keep these behind both authentication and admin authorization.
adminRouter.get("/analytics/overview", verifyAuth, requireAdmin, analyticsQueryValidator, getAnalyticsOverview);
adminRouter.get("/analytics/requests-trend", verifyAuth, requireAdmin, analyticsQueryValidator, getRequestsTrend);
adminRouter.get("/analytics/certificate-types", verifyAuth, requireAdmin, analyticsQueryValidator, getCertificateTypes);
adminRouter.get("/analytics/turnaround", verifyAuth, requireAdmin, analyticsQueryValidator, getTurnaround);
adminRouter.get("/analytics/team-leaders", verifyAuth, requireAdmin, analyticsQueryValidator, getTeamLeaderPerformance);
adminRouter.get("/analytics/domains", verifyAuth, requireAdmin, analyticsQueryValidator, getDomainAnalytics);
adminRouter.get("/analytics/pipeline", verifyAuth, requireAdmin, analyticsQueryValidator, getAnalyticsPipeline);
adminRouter.get("/analytics/stuck", verifyAuth, requireAdmin, analyticsQueryValidator, getStuckRequests);
adminRouter.get("/analytics/stuck-requests", verifyAuth, requireAdmin, analyticsQueryValidator, getStuckRequests);
adminRouter.get("/analytics/upcoming-completions", verifyAuth, requireAdmin, analyticsQueryValidator, getUpcomingCompletions);
adminRouter.get("/analytics/export", verifyAuth, requireAdmin, analyticsQueryValidator, exportAnalytics);

export default adminRouter;
