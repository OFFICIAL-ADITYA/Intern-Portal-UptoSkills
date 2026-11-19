import mongoose from "mongoose";
import XLSX from "xlsx";
import User from "../models/User.js";
import CertificateRequest from "../models/CertificateRequest.js";
import Certificate from "../models/Certificate.js";
import AuditLog from "../models/AuditLog.model.js";

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes in-memory cache

// In-memory cache for analytics endpoints
const analyticsCache = new Map();

export function clearAnalyticsCache() {
  analyticsCache.clear();
}

function getCache(key) {
  const cached = analyticsCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    analyticsCache.delete(key);
    return null;
  }
  return cached.data;
}

function setCache(key, data) {
  analyticsCache.set(key, { timestamp: Date.now(), data });
}

function parseDate(value, label) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`Invalid ${label} date.`);
    error.status = 400;
    throw error;
  }
  return date;
}

function getFilters(query = {}) {
  const from = parseDate(query.from, "from");
  const to = parseDate(query.to, "to");
  if (from && to && from > to) {
    const error = new Error("The from date must be before or equal to the to date.");
    error.status = 400;
    throw error;
  }
  const rawDays = Number.parseInt(query.overdueDays ?? "3", 10);
  const teamLeader = (query.teamLeaderId || query.teamLeader || "").trim();
  return {
    from,
    to,
    domain: typeof query.domain === "string" ? query.domain.trim() : "",
    teamLeader,
    overdueDays: Number.isFinite(rawDays) ? Math.min(Math.max(rawDays, 1), 365) : 3,
  };
}

function dateMatch(field, { from, to }) {
  const match = {};
  if (from || to) {
    match[field] = {};
    if (from) match[field].$gte = from;
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      match[field].$lte = end;
    }
  }
  return match;
}

async function getLeaderScope(teamLeader) {
  if (!teamLeader) return null;
  const isObjectId = mongoose.isValidObjectId(teamLeader);
  const leader = await User.findOne({
    role: "teamleader",
    ...(isObjectId ? { _id: teamLeader } : { email: teamLeader.toLowerCase() }),
  }).select("_id email").lean();

  if (!leader) {
    return { id: new mongoose.Types.ObjectId(), email: "__unmatched_tl__" };
  }
  return { id: leader._id, email: leader.email.toLowerCase() };
}

async function buildScope(filters) {
  const leader = await getLeaderScope(filters.teamLeader);
  const userMatch = { role: "intern", ...dateMatch("createdAt", filters) };
  const requestMatch = { ...dateMatch("requestedAt", filters) };
  const certificateMatch = { ...dateMatch("issuedDate", filters) };

  if (filters.domain) {
    userMatch.domain = filters.domain;
    certificateMatch.domain = filters.domain;
  }

  if (leader) {
    userMatch.$or = [
      { "internshipDetails.teamLeaderId": leader.id },
      { "internshipDetails.teamleaderEmail": leader.email }
    ];
  }

  if (leader || filters.domain) {
    const scopedInterns = await User.find(userMatch).select("_id").lean();
    const internIds = scopedInterns.map((u) => u._id);
    requestMatch.userId = { $in: internIds };
    certificateMatch.userId = { $in: internIds };
  }

  return { userMatch, requestMatch, certificateMatch, leader };
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return Math.round((sorted[lower] / DAY) * 10) / 10;
  return Math.round((((sorted[lower] * (upper - index)) + (sorted[upper] * (index - lower))) / DAY) * 10) / 10;
}

function durationStats(values) {
  if (!values.length) return { averageDays: 0, medianDays: 0, p90Days: 0, sampleSize: 0 };
  return {
    averageDays: Math.round((values.reduce((sum, v) => sum + v, 0) / values.length / DAY) * 10) / 10,
    medianDays: percentile(values, 0.5),
    p90Days: percentile(values, 0.9),
    sampleSize: values.length,
  };
}

/**
 * Task G: GET /api/admin/analytics/overview
 */
export async function getAnalyticsOverview(req, res) {
  try {
    const cacheKey = `overview_${JSON.stringify(req.query)}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const filters = getFilters(req.query);
    const { userMatch, requestMatch, certificateMatch } = await buildScope(filters);

    // Active interns must not be archived
    const activeInternFilter = {
      ...userMatch,
      isArchived: { $ne: true },
      "internshipDetails.status": "ongoing"
    };

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      allInterns,
      activeCount,
      teamLeadersCount,
      allRequests,
      monthRequestsCount,
      monthCertificatesCount
    ] = await Promise.all([
      User.find(userMatch).select("internshipDetails.status isArchived").lean(),
      User.countDocuments(activeInternFilter),
      User.countDocuments({ role: "teamleader" }),
      CertificateRequest.find(requestMatch).select("status requestedAt forwardedAt reviewedAt certificateId").lean(),
      CertificateRequest.countDocuments({ ...requestMatch, requestedAt: { $gte: startOfMonth } }),
      Certificate.countDocuments({ ...certificateMatch, status: "finalized", issuedDate: { $gte: startOfMonth } })
    ]);

    const ongoingCount = allInterns.filter((u) => u.internshipDetails?.status === "ongoing" && !u.isArchived).length;
    const upcomingCount = allInterns.filter((u) => u.internshipDetails?.status === "upcoming" && !u.isArchived).length;
    const completedCount = allInterns.filter((u) => u.internshipDetails?.status === "completed").length;
    const cancelledCount = allInterns.filter((u) => u.internshipDetails?.status === "cancelled").length;

    const pendingRequests = allRequests.filter((r) => r.status === "pending" || r.status === "processing").length;
    
    // Decided requests: approved, completed, rejected
    const decidedRequests = allRequests.filter((r) => ["approved", "completed", "rejected"].includes(r.status));
    const approvedRequests = allRequests.filter((r) => ["approved", "completed"].includes(r.status)).length;
    const rejectedRequests = allRequests.filter((r) => r.status === "rejected").length;

    const approvalRate = decidedRequests.length ? Math.round((approvedRequests / decidedRequests.length) * 100) : 0;
    const rejectionRate = decidedRequests.length ? Math.round((rejectedRequests / decidedRequests.length) * 100) : 0;

    // Total turnaround: Certificate.issuedAt minus requestedAt
    const turnaroundMsList = [];
    const completedWithCert = await CertificateRequest.find({
      ...requestMatch,
      status: "completed",
      certificateId: { $exists: true, $ne: null }
    }).populate("certificateId", "issuedAt issuedDate").lean();

    for (const reqItem of completedWithCert) {
      const issued = reqItem.certificateId?.issuedAt || reqItem.certificateId?.issuedDate;
      if (issued && reqItem.requestedAt) {
        const diff = new Date(issued).getTime() - new Date(reqItem.requestedAt).getTime();
        if (diff >= 0) turnaroundMsList.push(diff);
      }
    }

    const avgTurnaroundDays = turnaroundMsList.length
      ? Math.round((turnaroundMsList.reduce((acc, v) => acc + v, 0) / turnaroundMsList.length / DAY) * 10) / 10
      : 0;

    const responseData = {
      kpis: {
        totalInterns: allInterns.length,
        activeInterns: activeCount || ongoingCount,
        ongoingInterns: ongoingCount,
        upcomingInterns: upcomingCount,
        completedInterns: completedCount,
        cancelledInterns: cancelledCount,
        totalTeamLeaders: teamLeadersCount,
        pendingRequests,
        requestsThisMonth: monthRequestsCount,
        certificatesIssuedThisMonth: monthCertificatesCount,
        approvalRate,
        rejectionRate,
        averageTurnaroundDays: avgTurnaroundDays,
      },
      filters: { from: filters.from, to: filters.to, domain: filters.domain, teamLeader: filters.teamLeader },
      generatedAt: new Date().toISOString(),
    };

    setCache(cacheKey, responseData);
    return res.json(responseData);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || "Unable to load analytics overview." });
  }
}

/**
 * Task G: GET /api/admin/analytics/requests-trend?groupBy=month
 */
export async function getRequestsTrend(req, res) {
  try {
    const cacheKey = `trend_${JSON.stringify(req.query)}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const filters = getFilters(req.query);
    const { requestMatch } = await buildScope(filters);
    const groupBy = req.query.groupBy === "week" ? "week" : req.query.groupBy === "day" ? "day" : "month";
    const requestedRange = req.query.range || "6m";

    let start = filters.from;
    if (!start && !filters.to) {
      start = new Date();
      start.setHours(0, 0, 0, 0);
      if (requestedRange === "7d") start.setDate(start.getDate() - 6);
      else if (requestedRange === "30d") start.setDate(start.getDate() - 29);
      else start.setMonth(start.getMonth() - 5, 1);
      requestMatch.requestedAt = { ...(requestMatch.requestedAt || {}), $gte: start };
    }

    const dateFormat = groupBy === "day" ? "%Y-%m-%d" : groupBy === "week" ? "%G-W%V" : "%Y-%m";
    const rows = await CertificateRequest.aggregate([
      { $match: requestMatch },
      { $group: { _id: { period: { $dateToString: { format: dateFormat, date: "$requestedAt" } }, status: "$status" }, count: { $sum: 1 } } },
      { $sort: { "_id.period": 1 } },
    ]);

    const periods = [...new Set(rows.map((r) => r._id.period).filter(Boolean))].sort();
    const VALID_STATUSES = ["pending", "processing", "approved", "completed", "rejected"];
    const series = VALID_STATUSES.map((status) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      status,
      data: periods.map((p) => rows.find((r) => r._id.period === p && r._id.status === status)?.count || 0)
    }));

    const responseData = { labels: periods, series };
    setCache(cacheKey, responseData);
    return res.json(responseData);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || "Unable to load request trends." });
  }
}

/**
 * Task G: GET /api/admin/analytics/certificate-types
 */
export async function getCertificateTypes(req, res) {
  try {
    const cacheKey = `cert_types_${JSON.stringify(req.query)}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const filters = getFilters(req.query);
    const { certificateMatch } = await buildScope(filters);

    const rows = await Certificate.aggregate([
      { $match: { ...certificateMatch, status: "finalized" } },
      { $group: { _id: "$certificateType", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]);

    const items = rows.map((r) => ({
      name: (r._id || "Other").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      rawType: r._id,
      value: r.count
    }));

    const responseData = {
      labels: items.map((i) => i.name),
      series: [{ name: "Certificates", data: items.map((i) => i.value) }],
      items
    };

    setCache(cacheKey, responseData);
    return res.json(responseData);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || "Unable to load certificate types." });
  }
}

/**
 * Task G: GET /api/admin/analytics/turnaround
 * Reports avg, median, and p90 for TL decision, Admin decision, Generation time, and Total turnaround.
 */
export async function getTurnaround(req, res) {
  try {
    const cacheKey = `turnaround_${JSON.stringify(req.query)}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const filters = getFilters(req.query);
    const { requestMatch } = await buildScope(filters);

    const requests = await CertificateRequest.find(requestMatch)
      .populate("certificateId", "issuedAt issuedDate createdAt")
      .select("requestedAt forwardedAt reviewedAt status certificateId")
      .lean();

    const tlDurations = [];
    const adminDurations = [];
    const genDurations = [];
    const totalDurations = [];

    for (const reqItem of requests) {
      const reqTime = reqItem.requestedAt ? new Date(reqItem.requestedAt).getTime() : null;
      const fwdTime = reqItem.forwardedAt ? new Date(reqItem.forwardedAt).getTime() : null;
      const revTime = reqItem.reviewedAt ? new Date(reqItem.reviewedAt).getTime() : null;
      const certTime = reqItem.certificateId?.issuedAt || reqItem.certificateId?.issuedDate
        ? new Date(reqItem.certificateId.issuedAt || reqItem.certificateId.issuedDate).getTime()
        : null;

      // 1. TL decision time: forwardedAt - requestedAt (or reviewedAt - requestedAt if rejected by TL)
      if (reqTime && fwdTime && fwdTime >= reqTime) {
        tlDurations.push(fwdTime - reqTime);
      } else if (reqTime && revTime && reqItem.status === "rejected" && !fwdTime && revTime >= reqTime) {
        tlDurations.push(revTime - reqTime);
      }

      // 2. Admin decision time: reviewedAt - forwardedAt
      if (fwdTime && revTime && revTime >= fwdTime) {
        adminDurations.push(revTime - fwdTime);
      }

      // 3. Generation time: Certificate.issuedAt - reviewedAt
      if (revTime && certTime && certTime >= revTime) {
        genDurations.push(certTime - revTime);
      }

      // 4. Total turnaround: Certificate.issuedAt - requestedAt
      if (reqTime && certTime && certTime >= reqTime) {
        totalDurations.push(certTime - reqTime);
      }
    }

    const stages = [
      { name: "Team Leader Review", stage: "tl_decision", ...durationStats(tlDurations) },
      { name: "Admin Review", stage: "admin_decision", ...durationStats(adminDurations) },
      { name: "Generation & Finalization", stage: "generation", ...durationStats(genDurations) },
      { name: "Total Turnaround", stage: "total", ...durationStats(totalDurations) }
    ];

    const responseData = {
      stages,
      overall: durationStats(totalDurations)
    };

    setCache(cacheKey, responseData);
    return res.json(responseData);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || "Unable to calculate turnaround." });
  }
}

/**
 * Task G: GET /api/admin/analytics/team-leaders
 * Per-TL performance table: interns assigned, requests received, forwarded, rejected, pending, avg TL decision time, overdue flag.
 */
export async function getTeamLeaderPerformance(req, res) {
  try {
    const cacheKey = `team_leaders_${JSON.stringify(req.query)}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const filters = getFilters(req.query);
    const teamLeaders = await User.find({ role: "teamleader" }).select("_id fullName email").lean();
    const cutoff = Date.now() - filters.overdueDays * DAY;

    const output = await Promise.all(teamLeaders.map(async (leader) => {
      const internQuery = {
        role: "intern",
        $or: [
          { "internshipDetails.teamLeaderId": leader._id },
          { "internshipDetails.teamleaderEmail": leader.email.toLowerCase() }
        ]
      };
      if (filters.domain) internQuery.domain = filters.domain;

      const interns = await User.find(internQuery).select("_id").lean();
      const internIds = interns.map((i) => i._id);

      const requestQuery = {
        userId: { $in: internIds },
        ...dateMatch("requestedAt", filters)
      };

      const requests = await CertificateRequest.find(requestQuery)
        .select("status requestedAt forwardedAt reviewedAt")
        .lean();

      const received = requests.length;
      const forwarded = requests.filter((r) => r.forwardedAt || ["processing", "approved", "completed"].includes(r.status)).length;
      const rejected = requests.filter((r) => r.status === "rejected" && !r.forwardedAt).length;
      const pending = requests.filter((r) => r.status === "pending").length;

      // Overdue: pending with TL longer than overdueDays
      const overdue = requests.filter((r) => r.status === "pending" && new Date(r.requestedAt).getTime() < cutoff).length;

      const tlDurations = [];
      for (const r of requests) {
        const reqTime = r.requestedAt ? new Date(r.requestedAt).getTime() : null;
        const fwdTime = r.forwardedAt ? new Date(r.forwardedAt).getTime() : null;
        const revTime = r.reviewedAt ? new Date(r.reviewedAt).getTime() : null;
        if (reqTime && fwdTime && fwdTime >= reqTime) {
          tlDurations.push(fwdTime - reqTime);
        } else if (reqTime && revTime && r.status === "rejected" && !fwdTime && revTime >= reqTime) {
          tlDurations.push(revTime - reqTime);
        }
      }

      const avgDecisionDays = tlDurations.length
        ? Math.round((tlDurations.reduce((sum, d) => sum + d, 0) / tlDurations.length / DAY) * 10) / 10
        : 0;

      const decided = forwarded + rejected;
      const rejectionRate = decided ? Math.round((rejected / decided) * 100) : 0;

      return {
        id: String(leader._id),
        fullName: leader.fullName,
        email: leader.email,
        internsAssigned: interns.length,
        requestsReceived: received,
        requestsForwarded: forwarded,
        requestsRejected: rejected,
        requestsPending: pending,
        overdueRequests: overdue,
        hasOverdue: overdue > 0,
        averageDecisionDays: avgDecisionDays,
        rejectionRate,
      };
    }));

    const sorted = output
      .filter((l) => !filters.teamLeader || l.id === filters.teamLeader || l.email.toLowerCase() === filters.teamLeader.toLowerCase())
      .sort((a, b) => b.overdueRequests - a.overdueRequests || b.requestsPending - a.requestsPending || a.fullName.localeCompare(b.fullName));

    const responseData = { items: sorted, overdueDays: filters.overdueDays };
    setCache(cacheKey, responseData);
    return res.json(responseData);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || "Unable to load team leader performance." });
  }
}

/**
 * Task G: GET /api/admin/analytics/domains
 * Interns per domain (counts per domain). Shape { labels: [], series: [], items: [] }
 */
export async function getDomainAnalytics(req, res) {
  try {
    const cacheKey = `domains_${JSON.stringify(req.query)}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const filters = getFilters(req.query);
    const { userMatch } = await buildScope({ ...filters, teamLeader: "" });

    const rows = await User.aggregate([
      { $match: { ...userMatch, role: "intern" } },
      { $group: { _id: { $ifNull: ["$domain", "Unassigned"] }, count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]);

    const items = rows.map((r) => ({ name: r._id || "Unassigned", value: r.count }));
    const responseData = {
      labels: items.map((i) => i.name),
      series: [{ name: "Interns", data: items.map((i) => i.value) }],
      items
    };

    setCache(cacheKey, responseData);
    return res.json(responseData);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || "Unable to load domain analytics." });
  }
}

/**
 * Task G: GET /api/admin/analytics/pipeline
 * Maps current requests to exact specification stages:
 * - With Team Leader: status = pending
 * - With Admin: status = processing
 * - Awaiting finalization: status = approved with a draft certificate
 * - Failed generation: status = approved, older than 1 hour, no certificate or no draft
 * - Completed: status = completed
 * - Rejected by TL: status = rejected and no forwardedAt
 * - Rejected by Admin: status = rejected and forwardedAt exists
 */
export async function getAnalyticsPipeline(req, res) {
  try {
    const cacheKey = `pipeline_${JSON.stringify(req.query)}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const filters = getFilters(req.query);
    const { requestMatch } = await buildScope(filters);

    const requests = await CertificateRequest.find(requestMatch)
      .populate("certificateId", "status")
      .select("status requestedAt forwardedAt reviewedAt certificateId updatedAt")
      .lean();

    const now = Date.now();
    let withTL = 0;
    let withAdmin = 0;
    let awaitingFinalization = 0;
    let failedGeneration = 0;
    let completed = 0;
    let rejectedByTL = 0;
    let rejectedByAdmin = 0;

    for (const r of requests) {
      if (r.status === "pending") {
        withTL++;
      } else if (r.status === "processing") {
        withAdmin++;
      } else if (r.status === "approved") {
        const cert = r.certificateId;
        const timeSinceReview = r.reviewedAt ? now - new Date(r.reviewedAt).getTime() : now - new Date(r.updatedAt).getTime();
        if (cert && cert.status === "draft") {
          awaitingFinalization++;
        } else if (!cert || cert.status !== "finalized") {
          if (timeSinceReview > HOUR) {
            failedGeneration++;
          } else {
            awaitingFinalization++;
          }
        }
      } else if (r.status === "completed") {
        completed++;
      } else if (r.status === "rejected") {
        if (r.forwardedAt) {
          rejectedByAdmin++;
        } else {
          rejectedByTL++;
        }
      }
    }

    const items = [
      { stage: "with_tl", name: "With Team Leader", status: "pending", count: withTL },
      { stage: "with_admin", name: "With Admin", status: "processing", count: withAdmin },
      { stage: "awaiting_finalization", name: "Awaiting Finalization", status: "approved", count: awaitingFinalization },
      { stage: "failed_generation", name: "Failed Generation", status: "approved", count: failedGeneration },
      { stage: "completed", name: "Completed", status: "completed", count: completed },
      { stage: "rejected_tl", name: "Rejected by TL", status: "rejected", count: rejectedByTL },
      { stage: "rejected_admin", name: "Rejected by Admin", status: "rejected", count: rejectedByAdmin },
    ];

    const responseData = {
      labels: items.map((i) => i.name),
      series: [{ name: "Requests", data: items.map((i) => i.count) }],
      items
    };

    setCache(cacheKey, responseData);
    return res.json(responseData);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || "Unable to load request pipeline." });
  }
}

/**
 * Task G: GET /api/admin/analytics/stuck
 * Overdue requests: still pending with TL > N days, or processing with Admin > N days (default 3 days).
 */
export async function getStuckRequests(req, res) {
  try {
    const cacheKey = `stuck_${JSON.stringify(req.query)}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const filters = getFilters(req.query);
    const { requestMatch } = await buildScope(filters);
    const cutoff = new Date(Date.now() - filters.overdueDays * DAY);

    const overdueQuery = {
      $and: [
        requestMatch,
        {
          $or: [
            { status: "pending", requestedAt: { $lt: cutoff } },
            { status: "processing", forwardedAt: { $lt: cutoff } }
          ]
        }
      ]
    };

    const requests = await CertificateRequest.find(overdueQuery)
      .populate("userId", "fullName email domain internCode internshipDetails")
      .sort({ requestedAt: 1 })
      .limit(100)
      .lean();

    const items = requests.map((item) => {
      const waitStart = item.status === "processing" && item.forwardedAt ? item.forwardedAt : item.requestedAt;
      const waitingDays = Math.floor((Date.now() - new Date(waitStart).getTime()) / DAY);
      return {
        id: String(item._id),
        requestNumber: item.requestNumber,
        certificateType: item.certificateType,
        status: item.status,
        requestedAt: item.requestedAt,
        forwardedAt: item.forwardedAt,
        internName: item.userId?.fullName || "Unknown intern",
        internEmail: item.userId?.email || "",
        internCode: item.userId?.internCode || item.internCode || "",
        domain: item.userId?.domain || "Unassigned",
        teamLeaderEmail: item.userId?.internshipDetails?.teamleaderEmail || "",
        stuckAt: item.status === "pending" ? "Team Leader" : "Admin",
        waitingDays: Math.max(1, waitingDays),
        isOverdue: true
      };
    });

    const responseData = { items, overdueDays: filters.overdueDays };
    setCache(cacheKey, responseData);
    return res.json(responseData);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || "Unable to load stuck requests." });
  }
}

/**
 * Task G: GET /api/admin/analytics/upcoming-completions
 * Ongoing interns whose endDate falls in the next 7 or 30 days, flagging whether they have a completion certificate request.
 */
export async function getUpcomingCompletions(req, res) {
  try {
    const cacheKey = `upcoming_${JSON.stringify(req.query)}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const filters = getFilters(req.query);
    const days = Number.parseInt(req.query.days || "30", 10) === 7 ? 7 : 30;
    const now = new Date();
    const futureEnd = new Date(now.getTime() + days * DAY);

    const query = {
      role: "intern",
      isArchived: { $ne: true },
      "internshipDetails.status": "ongoing",
      endDate: { $gte: now, $lte: futureEnd }
    };

    if (filters.domain) query.domain = filters.domain;
    if (filters.teamLeader) {
      const leader = await getLeaderScope(filters.teamLeader);
      if (leader) {
        query.$or = [
          { "internshipDetails.teamLeaderId": leader.id },
          { "internshipDetails.teamleaderEmail": leader.email }
        ];
      }
    }

    const interns = await User.find(query)
      .select("fullName email domain endDate internshipDetails internCode")
      .sort({ endDate: 1 })
      .lean();

    const internIds = interns.map((i) => i._id);
    const existingRequests = await CertificateRequest.find({
      userId: { $in: internIds },
      certificateType: "completion_certificate"
    }).select("userId").lean();

    const requestedSet = new Set(existingRequests.map((r) => String(r.userId)));

    const items = interns.map((item) => {
      const remainingDays = Math.ceil((new Date(item.endDate) - now) / DAY);
      return {
        id: String(item._id),
        fullName: item.fullName,
        email: item.email,
        internCode: item.internCode || "",
        domain: item.domain || "Unassigned",
        endDate: item.endDate,
        daysRemaining: Math.max(0, remainingDays),
        hasRequestedCertificate: requestedSet.has(String(item._id)),
        teamLeaderEmail: item.internshipDetails?.teamleaderEmail || ""
      };
    });

    const responseData = { items, total: items.length, daysWindow: days };
    setCache(cacheKey, responseData);
    return res.json(responseData);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || "Unable to load upcoming completions." });
  }
}

const EXPORTS = {
  overview: getAnalyticsOverview,
  "requests-trend": getRequestsTrend,
  "certificate-types": getCertificateTypes,
  turnaround: getTurnaround,
  "team-leaders": getTeamLeaderPerformance,
  domains: getDomainAnalytics,
  pipeline: getAnalyticsPipeline,
  stuck: getStuckRequests,
  "stuck-requests": getStuckRequests,
  "upcoming-completions": getUpcomingCompletions,
};

/**
 * Task G: GET /api/admin/analytics/export?type=...
 * Generates CSV, logs with logAction (action: EXPORT).
 */
export async function exportAnalytics(req, res) {
  try {
    const type = String(req.query.type || "").trim();
    const handler = EXPORTS[type];
    if (!handler) {
      return res.status(400).json({ message: `Unsupported export type: ${type}` });
    }

    const mockRes = {
      statusCode: 200,
      payload: null,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.payload = data; return this; },
    };

    await handler({ ...req, query: req.query }, mockRes);
    if (mockRes.statusCode >= 400) {
      return res.status(mockRes.statusCode).json(mockRes.payload);
    }

    const payload = mockRes.payload || {};
    let rows = [];

    if (Array.isArray(payload.items)) {
      rows = payload.items;
    } else if (payload.kpis) {
      rows = [payload.kpis];
    } else if (payload.stages) {
      rows = payload.stages;
    } else if (Array.isArray(payload.labels) && Array.isArray(payload.series)) {
      rows = payload.labels.map((label, idx) => {
        const row = { label };
        for (const s of payload.series) {
          row[s.name] = s.data[idx] ?? 0;
        }
        return row;
      });
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ message: "No data found for selected filters" }]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Analytics");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "csv" });

    await AuditLog.create({
      userId: req.user?.id || null,
      action: "EXPORT",
      targetType: "admin_analytics",
      targetId: null,
      meta: { type, format: "csv" },
      ip: req.ip,
      userAgent: req.get?.("user-agent") || "",
    });

    res.setHeader("Content-Disposition", `attachment; filename="analytics-${type}.csv"`);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    return res.send(buffer);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || "Unable to export analytics." });
  }
}
