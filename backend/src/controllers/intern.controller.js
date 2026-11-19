import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import axios from "axios";
import User from "../models/User.js";
import CertificateRequest from "../models/CertificateRequest.js";
import Certificate from "../models/Certificate.js";
import Counter from "../models/Counter.model.js";
import { logAction } from "../utils/logAction.js";
import { notify } from "../services/notification.service.js";
import { clearAnalyticsCache } from "./adminAnalytics.controller.js";

const ALLOWED_TYPES = [
  "offer_letter",
  "bonafide",
  "ojt_certificate",
  "experience_letter",
  "experience_letter_detailed",
  "completion_certificate",
  "intern_of_month",
  "league_winner",
  "custom",
];

const generateRequestNumber = async () => {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { _id: "certRequest" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );

  return `CERT-${year}-${String(counter.seq).padStart(5, "0")}`;
};

export const submitCertificateRequest = async (req, res) => {
  try {
    const { certificateType, reason } = req.body;

    if (!certificateType || !ALLOWED_TYPES.includes(certificateType)) {
      return res
        .status(400)
        .json({ message: "Valid certificate type is required" });
    }

    // intern details auto-filled from the logged-in user — nothing typed by intern
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.startDate) {
      return res
        .status(404)
        .json({ message: "No internship details found for this account" });
    }

    const existingPending = await CertificateRequest.findOne({
      userId: req.user.id,
      certificateType,
      status: { $in: ["pending", "processing"] },
    });
    if (existingPending) {
      return res
        .status(409)
        .json({
          message:
            "You already have a request in progress for this certificate type",
        });
    }

    const requestNumber = await generateRequestNumber();

    const request = await CertificateRequest.create({
      requestNumber,
      userId: req.user.id,
      internCode: user.internCode,
      certificateType,
      reason,
    });

    logAction({
      req,
      actor: user,
      action: "REQUEST_SUBMITTED",
      targetType: "certificate_request",
      targetId: request._id,
      meta: { certificateType, requestNumber },
    });

    // Notify the intern's Team Leader (in-app and email)
    const tlEmail = user.internshipDetails?.teamleaderEmail;
    if (tlEmail) {
      const tl = await User.findOne({ email: tlEmail.toLowerCase(), role: "teamleader" });
      if (tl) {
        notify(tl._id, "REQUEST_SUBMITTED", {
          title: "New Certificate Request",
          message: `${user.fullName} (${user.internCode || "Intern"}) submitted a request for ${(certificateType || "").replace(/_/g, " ")}.`,
          requestId: request._id,
          email: true,
        });
      } else {
        console.warn(`[submitCertificateRequest] Warning: No team leader found matching email ${tlEmail}`);
      }
    } else {
      console.warn(`[submitCertificateRequest] Warning: Intern ${user._id} has no teamleaderEmail assigned`);
    }

    clearAnalyticsCache();
    res.status(201).json({ request });
  } catch (err) {
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const getMyRequests = async (req, res) => {
  try {
    const requests = await CertificateRequest.find({ userId: req.user.id })
      .populate("certificateId", "certificateNumber status pdfPath issuedDate")
      .sort({ requestedAt: -1 });

    // Sanitize requests to guarantee draft certificates are NEVER exposed to the intern
    const sanitizedRequests = requests.map((reqDoc) => {
      const plain = reqDoc.toObject();
      if (
        plain.certificateId &&
        (plain.certificateId.status !== "finalized" ||
          plain.status !== "completed")
      ) {
        delete plain.certificateId;
      }
      return plain;
    });

    res.json({ requests: sanitizedRequests });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    // req.user is set by verifyToken middleware after decoding the JWT — { id, role }
    const user = await User.findById(req.user.id).select("-password"); // never send password back, even hashed

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Task C: Compute archival warning days if internship has completed
    let daysUntilArchival = null;
    let isArchivalWarning = false;
    if (user.endDate && user.internshipDetails?.status === 'completed' && !user.isArchived) {
      const RetentionPolicy = (await import('../models/RetentionPolicy.model.js')).default;
      const policy = await RetentionPolicy.getOrCreatePolicy();
      const graceDays = policy.graceDays || 30;
      const endMs = new Date(user.endDate).getTime();
      const targetArchivalMs = endMs + graceDays * 24 * 60 * 60 * 1000;
      const diffDays = Math.ceil((targetArchivalMs - Date.now()) / (24 * 60 * 60 * 1000));
      if (diffDays <= 7 && diffDays > 0) {
        daysUntilArchival = diffDays;
        isArchivalWarning = true;
      }
    }

    const userObj = user.toObject();
    userObj.daysUntilArchival = daysUntilArchival;
    userObj.isArchivalWarning = isArchivalWarning;

    res.json({ user: userObj });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * Fetches finalized certificate metadata for a specific CertificateRequest owned by the intern.
 * Enforces strict ownership, never exposes drafts or private internal fields.
 */
export const getCertificateForRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }

    const request = await CertificateRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: "Certificate request not found" });
    }

    // Strict ownership verification: cannot access another intern's request
    if (request.userId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({
          message: "Access denied: You do not own this certificate request",
        });
    }

    if (!request.certificateId) {
      return res
        .status(404)
        .json({ message: "No certificate exists for this request" });
    }

    const certificate = await Certificate.findById(request.certificateId);
    if (!certificate) {
      return res.status(404).json({ message: "Certificate record not found" });
    }

    // Secondary ownership verification
    if (certificate.userId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Access denied: Certificate does not belong to you" });
    }

    // Never expose draft certificates to the intern
    if (certificate.status !== "finalized" || request.status !== "completed") {
      return res.status(400).json({
        message: "Certificate is not finalized or available yet",
        status: request.status,
      });
    }

    return res.status(200).json({
      certificate: {
        _id: certificate._id,
        certificateNumber: certificate.certificateNumber,
        certificateType: certificate.certificateType,
        domain: certificate.domain,
        issuedDate: certificate.issuedDate,
        status: certificate.status,
        verificationCode: certificate.verificationCode,
        hasPdf: Boolean(certificate.pdfPath),
        downloadUrl: `/api/intern/requests/${request._id}/certificate/download`,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Streams the finalized certificate PDF directly to the authenticated intern.
 * Validates ownership, checks file existence, and handles missing files with controlled errors.
 */
export const downloadCertificateForRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }

    const request = await CertificateRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: "Certificate request not found" });
    }

    if (request.userId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({
          message: "Access denied: You do not own this certificate request",
        });
    }

    if (!request.certificateId) {
      return res
        .status(404)
        .json({ message: "No certificate exists for this request" });
    }

    const certificate = await Certificate.findById(request.certificateId);
    if (!certificate) {
      return res.status(404).json({ message: "Certificate record not found" });
    }

    if (certificate.userId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Access denied: Certificate does not belong to you" });
    }

    if (certificate.status !== "finalized" || request.status !== "completed") {
      return res
        .status(400)
        .json({ message: "Certificate has not been finalized yet" });
    }

    if (!certificate.pdfPath) {
      return res
        .status(404)
        .json({ message: "Certificate PDF path is missing" });
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const absolutePath = path.resolve(__dirname, "../../", certificate.pdfPath);

    if (!fs.existsSync(absolutePath)) {
      return res
        .status(404)
        .json({ message: "Certificate PDF file is unavailable on server" });
    }

    const safeFileName = `${(certificate.certificateNumber || "Certificate").replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

    return res.download(absolutePath, safeFileName);
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Task H: Set or update intern password
 * PATCH /api/intern/set-password
 * Body: { currentSecret, newPassword }
 */
export const setPassword = async (req, res) => {
  try {
    const { currentSecret, newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({ message: 'New password is required' });
    }

    // Password rules: at least 8 characters with at least one letter and one number
    const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!passwordPattern.test(newPassword)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long and contain at least one letter and one number'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate currentSecret
    let isCurrentValid = false;
    if (!user.passwordSetAt) {
      // First time setting password: currentSecret must match internCode
      if (currentSecret && user.internCode && currentSecret === user.internCode) {
        isCurrentValid = true;
      } else if (currentSecret && user.password) {
        isCurrentValid = await user.comparePassword(currentSecret);
      }
    } else {
      // Password already set: currentSecret must be their current password
      if (currentSecret && user.password) {
        isCurrentValid = await user.comparePassword(currentSecret);
      }
    }

    if (!isCurrentValid) {
      return res.status(400).json({
        message: user.passwordSetAt
          ? 'Current password is incorrect'
          : 'Invalid intern code'
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordSetAt = new Date();
    await user.save();

    await logAction({
      req,
      actor: user,
      action: 'PASSWORD_CHANGED',
      targetType: 'user',
      targetId: user._id,
      meta: { email: user.email }
    });

    return res.status(200).json({
      message: 'Password updated successfully'
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Task H: Whitelisted intern profile update
 * PATCH /api/intern/profile
 * Only mobileNo is editable. Ignores every other field in the body.
 */
export const updateProfile = async (req, res) => {
  try {
    const { mobileNo } = req.body;

    if (mobileNo !== undefined) {
      const cleanMobile = String(mobileNo).trim();
      const mobileRegex = /^[0-9+\-\s()]{7,20}$/;
      if (cleanMobile && !mobileRegex.test(cleanMobile)) {
        return res.status(400).json({ message: 'Invalid mobile number format' });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      user.mobileNo = cleanMobile;
      await user.save();

      await logAction({
        req,
        actor: user,
        action: 'PROFILE_UPDATED',
        targetType: 'user',
        targetId: user._id,
        meta: { mobileNo: cleanMobile }
      });

      return res.status(200).json({
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          mobileNo: user.mobileNo,
          domain: user.domain,
          passwordSetAt: user.passwordSetAt
        }
      });
    }

    return res.status(400).json({ message: 'mobileNo is required' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Task M: Chatbot Guidance Endpoint
 * POST /api/intern/chat
 * Validates message length, calls CHATBOT_SERVICE_URL if available,
 * or returns polite, contextual portal guidance fallback.
 */
export const chatWithAssistant = async (req, res) => {
  try {
    const { message, question } = req.body || {};
    const rawMsg = message || question;

    if (!rawMsg || typeof rawMsg !== 'string' || !rawMsg.trim()) {
      return res.status(400).json({ message: 'A non-empty message is required.' });
    }

    const cleanMessage = rawMsg.trim();
    if (cleanMessage.length > 500) {
      return res.status(400).json({ message: 'Message exceeds maximum limit of 500 characters.' });
    }

    const user = await User.findById(req.user?.id).select('fullName domain internshipDetails');
    const chatbotUrl = process.env.CHATBOT_SERVICE_URL;

    // If external chatbot service is configured, forward request with 8s timeout
    if (chatbotUrl) {
      try {
        const response = await axios.post(
          chatbotUrl,
          {
            question: cleanMessage,
            prompt: cleanMessage,
            context: {
              role: 'intern',
              domain: user?.domain || 'General',
              status: user?.internshipDetails?.status || 'ongoing'
            }
          },
          {
            timeout: 8000,
            headers: {
              'Content-Type': 'application/json',
              ...(process.env.CHATBOT_API_KEY ? { Authorization: `Bearer ${process.env.CHATBOT_API_KEY}` } : {})
            }
          }
        );

        const answerText = response.data?.answer || response.data?.reply || response.data?.message;
        if (answerText) {
          return res.status(200).json({
            reply: answerText,
            answer: answerText,
            timestamp: new Date().toISOString()
          });
        }
      } catch (err) {
        console.warn('[Chatbot Service] External service unavailable, switching to internal fallback:', err.message);
      }
    }

    // Contextual portal guidance fallback
    const lower = cleanMessage.toLowerCase();
    let reply = "Hello! I am the UPTOSKILL Portal Assistant. How can I help you with your certificate requests, account settings, or internship guidelines?";

    if (lower.includes('request') && (lower.includes('certificate') || lower.includes('how'))) {
      reply = "To request a certificate, navigate to the 'Overview' tab on your dashboard and click 'Request Certificate'. Select your certificate type, provide an optional reason, and submit.";
    } else if (lower.includes('types') || lower.includes('what certificates') || lower.includes('available')) {
      reply = "Available certificate types include: Internship Completion Certificate, Bonafide Certificate, Offer Letter, On-the-Job Training (OJT) Certificate, and Experience Letters.";
    } else if (lower.includes('status') || lower.includes('track') || lower.includes('pending') || lower.includes('where')) {
      reply = "You can track your requests under 'My Requests' on your dashboard. When submitted, a request is 'Pending' with your Team Leader, then 'Processing' with Admin, and finally 'Completed' once finalized.";
    } else if (lower.includes('password') || lower.includes('change password') || lower.includes('mobile') || lower.includes('settings')) {
      reply = "You can update your password or mobile number from the 'Settings' tab in your dashboard sidebar. To set a password for the first time, use your initial Intern Code as your current secret.";
    } else if (lower.includes('download') || lower.includes('pdf')) {
      reply = "Once your certificate is finalized and marked 'Completed', click the 'Download PDF' button in the action column of your request list to download your official certificate.";
    } else if (lower.includes('verify') || lower.includes('qr') || lower.includes('verification')) {
      reply = "Every official certificate includes a unique QR code and 12-character Verification ID. Anyone can verify it publicly by scanning the QR code or visiting /verify/:verifyId.";
    } else if (lower.includes('contact') || lower.includes('team leader') || lower.includes('tl') || lower.includes('help')) {
      reply = "If you have questions regarding your evaluation or project milestones, please contact your assigned Team Leader. Their email address is displayed under your internship profile.";
    }

    return res.status(200).json({
      reply,
      answer: reply,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(200).json({
      reply: "The assistant is temporarily unavailable. Please refer to your dashboard tabs or reach out to your Team Leader for assistance.",
      answer: "The assistant is temporarily unavailable. Please refer to your dashboard tabs or reach out to your Team Leader for assistance.",
      timestamp: new Date().toISOString()
    });
  }
};
