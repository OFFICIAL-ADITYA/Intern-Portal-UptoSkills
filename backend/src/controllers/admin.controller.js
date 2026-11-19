import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Handlebars from 'handlebars';
import User from "../models/User.js";
import RetentionPolicy from "../models/RetentionPolicy.model.js";
import Certificate from '../models/Certificate.js';
import CertificateRequest from '../models/CertificateRequest.js';
import AuditLog from '../models/AuditLog.model.js';
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { generateInternCode } from "../utils/generateInternCode.js";
import { logAction } from "../utils/logAction.js";
import { notify } from "../services/notification.service.js";
import { clearAnalyticsCache } from "./adminAnalytics.controller.js";
import {
  createCertificateDraft,
  getCertificateDraft as fetchCertificateDraft,
  updateCertificateDraft as modifyCertificateDraft,
  finalizeCertificate as finalizeCertificateService,
  sendCertificateEmail,
  renderCertificatePdf
} from '../services/certificate.service.js';

dotenv.config();

export async function createIntern(req, res) {
    try {
        // Intern codes are used as initial passwords and hashed by the User model.
        const {
            fullName,
            email,
            mobileNo,
            domain,
            startDate,
            endDate,
            teamleaderEmail
        } = req.body;

        const isUserExists = await User.findOne({ email });

        if (isUserExists) {
            return res.status(409).json({
                message: "user already exists"
            })
        };

        let teamLeaderDoc = null;
        if (teamleaderEmail) {
            teamLeaderDoc = await User.findOne({ email: teamleaderEmail.toLowerCase(), role: 'teamleader' });
            if (!teamLeaderDoc) return res.status(400).json({ message: 'No team leader found with this email' });
        }

        const internCode = await generateInternCode();

        const user = await User.create({
            fullName,
            email,
            mobileNo,
            internCode,
            domain,
            startDate,
            endDate,
            role: "intern",
            password: internCode,
            internshipDetails: {
                teamLeaderId: teamLeaderDoc?._id || null,
                teamleaderEmail: teamleaderEmail?.toLowerCase(),
                status: 'upcoming',
                createdBy: req.user.id
            }
        });

        await logAction({
            req,
            actor: req.user,
            action: 'USER_CREATED',
            targetType: 'user',
            targetId: user._id,
            meta: { role: 'intern', email: user.email, fullName: user.fullName }
        });


        res.status(200).json({
            message: "User registered successfully",
            user: {
                id: user._id,
                email: user.email
            }
        })
    } catch (err) {
        res.status(500).json({
            message: "internal server error"
        })

    }
}

export async function createTeamLeader(req, res) {
    try {
        // Team leader passwords are hashed by the User model before persistence.
        const {
            fullName,
            email,
            mobileNo,
            startDate,
            endDate,
            password,
        } = req.body;

        const isUserExists = await User.findOne({ email });

        if (isUserExists) {
            return res.status(409).json({
                message: "user already exists"
            });
        }

        const user = await User.create({
            fullName,
            email,
            mobileNo,
            startDate,
            endDate,
            role: "teamleader",
            password
        });

        await logAction({
            req,
            actor: req.user,
            action: 'USER_CREATED',
            targetType: 'user',
            targetId: user._id,
            meta: { role: 'teamleader', email: user.email, fullName: user.fullName }
        });

        const token = jwt.sign({
            id: user._id,
            email: email
        }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.cookie("token", token);

        res.status(201).json({
            message: "Team leader created successfully",
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        res.status(500).json({
            message: "internal server error"
        })
    }
}

export async function getAllTeamLeaders(req, res) {
    try {
        const teamLeaders = await User.find({ role: 'teamleader' })
            .select('fullName email mobileNo')
            .sort({ fullName: 1 });

        return res.status(200).json({ teamLeaders });
    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
}

export async function getInternsByTeamLeader(req, res) {
    try {
        const teamLeader = await User.findOne({
            _id: req.params.id,
            role: 'teamleader'
        }).select('fullName email');

        if (!teamLeader) {
            return res.status(404).json({ message: 'Team leader not found' });
        }

        const interns = await User.find({
            role: 'intern',
            $or: [
                { 'internshipDetails.teamLeaderId': teamLeader._id },
                { 'internshipDetails.teamleaderEmail': teamLeader.email.toLowerCase() }
            ]
        })
            .select('fullName email internCode domain startDate endDate internshipDetails.status');

        return res.status(200).json({
            teamLeader: {
                fullName: teamLeader.fullName,
                email: teamLeader.email
            },
            interns
        });
    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
}


// Admin sees requests TL has forwarded, plus approved requests missing certificateId for recovery
export const getForwardedRequests = async (req, res) => {
  try {
    const requests = await CertificateRequest.find({
      $or: [
        { status: 'processing' },
        { status: 'approved', certificateId: { $in: [null, undefined] } }
      ]
    })
      .populate('userId', 'fullName email internCode domain')
      .sort({ requestedAt: -1 });

    res.json({ requests });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const finalizeRequest = async (req, res) => {
  try {
    const { action, rejectionReason } = req.body; // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'action must be "approve" or "reject"' });
    }

    const request = await CertificateRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (request.status !== 'processing') {
      return res.status(409).json({ message: 'This request is not awaiting admin decision' });
    }

    if (action === 'reject' && !rejectionReason) {
      return res.status(400).json({ message: 'rejectionReason is required when rejecting' });
    }

    request.status = action === 'approve' ? 'approved' : 'rejected';
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    if (action === 'reject') request.rejectionReason = rejectionReason;

    await request.save();

    let certificate = null;
    if (action === 'approve') {
      certificate = await createCertificateDraft(request._id);

      await logAction({
        req,
        actor: req.user,
        action: 'REQUEST_APPROVED',
        targetType: 'certificate_request',
        targetId: request._id,
        meta: { internId: request.userId, certificateType: request.certificateType }
      });

      notify(request.userId, 'REQUEST_APPROVED', {
        title: 'Certificate Request Approved',
        message: `Your certificate request for ${request.certificateType.replace(/_/g, ' ')} has been approved by admin. A certificate draft is ready.`,
        requestId: request._id,
        email: true
      });
    } else {
      await logAction({
        req,
        actor: req.user,
        action: 'REQUEST_REJECTED',
        targetType: 'certificate_request',
        targetId: request._id,
        meta: { rejectionReason, internId: request.userId }
      });

      notify(request.userId, 'REQUEST_REJECTED', {
        title: 'Certificate Request Rejected',
        message: `Your certificate request has been rejected by admin. Reason: ${rejectionReason}`,
        requestId: request._id,
        email: true
      });
    }

    clearAnalyticsCache();
    res.json({ request, certificate });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message || 'Server error', error: err.message });
  }
};

export const getCertificateDraft = async (req, res) => {
  try {
    const certificate = await fetchCertificateDraft(req.params.id);
    res.status(200).json({ certificate });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message || 'Server error' });
  }
};

export const updateCertificateDraft = async (req, res) => {
  try {
    const { htmlContent } = req.body;
    const certificate = await modifyCertificateDraft(req.params.id, htmlContent);
    res.status(200).json({ message: 'Draft saved successfully', certificate });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message || 'Server error' });
  }
};

export const finalizeCertificate = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Finalize certificate and render PDF
    const { certificate, request, absolutePdfPath } = await finalizeCertificateService(id);

    // 2. Send email with PDF attachment
    let emailSent = false;
    let emailError = null;

    try {
      await sendCertificateEmail({
        certificate,
        absolutePdfPath,
        user: certificate.userId
      });
      emailSent = true;
    } catch (mailErr) {
      emailError = mailErr.message || 'Email delivery failed';
    }

    clearAnalyticsCache();
    if (emailError) {
      return res.status(207).json({
        message: 'Certificate finalized and PDF generated successfully, but email delivery could not be completed.',
        certificate,
        request,
        emailSent: false,
        emailError
      });
    }

    return res.status(200).json({
      message: 'Certificate finalized, PDF generated, and email sent successfully.',
      certificate,
      request,
      emailSent: true
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ message: err.message || 'Server error', error: err.message });
  }
};

/**
 * Day 5 Admin Overview: Retrieves all certificates with safe intern details.
 */
export const getAllCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find()
      .populate('userId', 'fullName email internCode domain')
      .select('certificateNumber certificateType domain issuedDate status pdfPath internCode userId createdAt')
      .sort({ createdAt: -1 });

    return res.status(200).json({ certificates });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Day 5 Retry Generation: Recovers an approved CertificateRequest that lacks a certificate.
 * Reuses createCertificateDraft without duplicate generation or auto-finalization.
 */
export const retryCertificateGeneration = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid request ID' });
    }

    const request = await CertificateRequest.findById(id).populate('userId', 'fullName email internCode domain');
    if (!request) {
      return res.status(404).json({ message: 'Certificate request not found' });
    }

    // Eligibility validation: request must be approved
    if (request.status !== 'approved') {
      return res.status(400).json({
        message: `Request with status '${request.status}' is not eligible for retry. Only approved requests can be retried.`
      });
    }

    // Duplicate check: if certificateId is already present and valid
    if (request.certificateId) {
      const existingCert = await Certificate.findById(request.certificateId);
      if (existingCert) {
        return res.status(409).json({
          message: 'A certificate is already linked to this request',
          certificate: existingCert,
          request
        });
      }
    }

    // Re-use existing createCertificateDraft service
    const certificate = await createCertificateDraft(request._id);
    clearAnalyticsCache();

    return res.status(200).json({
      message: 'Certificate draft generated successfully',
      certificate,
      request
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ message: err.statusCode ? err.message : 'Internal server error' });
  }
};

/**
 * Day 5 Admin PDF Download: Securely streams the finalized certificate PDF for admin audit.
 */
export const downloadCertificatePdf = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid certificate ID' });
    }

    const certificate = await Certificate.findById(id);
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    if (!certificate.pdfPath || certificate.status !== 'finalized') {
      return res.status(400).json({ message: 'PDF has not been finalized or generated for this certificate' });
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const absolutePath = path.resolve(__dirname, '../../', certificate.pdfPath);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: 'Certificate PDF file is unavailable on server' });
    }

    const safeFileName = `${(certificate.certificateNumber || 'Certificate').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

    return res.download(absolutePath, safeFileName);
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Preview PDF rendering on-the-fly using Puppeteer.
 * Guarantees high-resolution, full-fidelity PDF matching the visual preview.
 */
export const renderPreviewPdf = async (req, res) => {
  try {
    const { htmlContent, title } = req.body;

    if (!htmlContent || typeof htmlContent !== 'string' || !htmlContent.trim()) {
      return res.status(400).json({ message: 'Certificate htmlContent is required for PDF rendering' });
    }

    const pdfBuffer = await renderCertificatePdf(htmlContent);
    const safeTitle = ((title || 'certificate-preview').replace(/[^a-zA-Z0-9_-]/g, '_')) || 'certificate';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.status(200).send(pdfBuffer);
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ message: err.message || 'Failed to generate preview PDF' });
  }
};

const validateTemplateHtml = (html) => {
  if (!html || typeof html !== 'string' || !html.trim()) {
    const error = new Error('HTML content is required.');
    error.statusCode = 400;
    throw error;
  }
  if (!/\{\{\s*fullName\s*\}\}/.test(html)) {
    const error = new Error('Template HTML must include the {{fullName}} placeholder.');
    error.statusCode = 400;
    throw error;
  }
  try {
    Handlebars.compile(html);
  } catch (hbErr) {
    const error = new Error(`Template has invalid Handlebars syntax or unbalanced brackets: ${hbErr.message}`);
    error.statusCode = 400;
    throw error;
  }
};

/**
 * Returns the list of standard certificate placeholders
 */
export const getTemplatePlaceholders = async (req, res) => {
  try {
    const placeholders = [
      { token: "{{fullName}}", key: "fullName", source: "User.fullName", description: "Intern full name", example: "Aditya Sharma", category: "candidate" },
      { token: "{{internCode}}", key: "internCode", source: "User.internCode", description: "Intern unique code", example: "INT-2026-0042", category: "candidate" },
      { token: "{{domain}}", key: "domain", source: "User.domain", description: "Internship domain", example: "Full Stack Web Development", category: "internship" },
      { token: "{{startDate}}", key: "startDate", source: "User.startDate (e.g. 12 Jan 2026)", description: "Internship start date", example: "12 Jan 2026", category: "internship" },
      { token: "{{endDate}}", key: "endDate", source: "User.endDate (e.g. 12 Jul 2026)", description: "Internship end date", example: "12 Jul 2026", category: "internship" },
      { token: "{{issueDate}}", key: "issueDate", source: "Date of finalization", description: "Certificate issue date", example: "15 Jul 2026", category: "certificate" },
      { token: "{{requestNumber}}", key: "requestNumber", source: "CertificateRequest.requestNumber", description: "Certificate request reference", example: "REQ-2026-00001", category: "certificate" },
      { token: "{{certificateTitle}}", key: "certificateTitle", source: "Mapped from certificateType", description: "Certificate title", example: "Internship Completion", category: "certificate" },
      { token: "{{qrCodeUrl}}", key: "qrCodeUrl", source: "QR verification link URL", description: "QR code verification URL placeholder", example: "https://uptoskills.com/verify/sample", category: "certificate" }
    ];
    return res.status(200).json({ placeholders });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const createTemplate = async (req, res) => {
  try {
    const CertificateTemplate = (await import("../models/CertificateTemplate.js")).default;

    const {
      name,
      templateName,
      certificateType,
      htmlContent,
      content,
      templateCode,
    } = req.body;

    const finalName = name || templateName;
    const finalContent = htmlContent || content;

    if (!finalName || !certificateType || !finalContent) {
      return res.status(400).json({
        message: "Template name, certificate type and HTML content are required.",
      });
    }

    // Validation: enforce {{fullName}} and balanced brackets
    validateTemplateHtml(finalContent);

    const generatedCode =
      templateCode ||
      `${certificateType}-${Date.now()}`.toLowerCase();

    const template = await CertificateTemplate.create({
      templateCode: generatedCode,
      templateName: finalName,
      certificateType,
      title: finalName,
      content: finalContent,
      status: "active",
      createdBy: req.user.id,
    });

    await logAction({
      req,
      actor: req.user,
      action: 'TEMPLATE_CREATED',
      targetType: 'certificate_template',
      targetId: template._id,
      meta: { templateName: template.templateName, certificateType: template.certificateType }
    });

    return res.status(201).json({
      message: "Template created successfully.",
      template,
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      message: err.message || "Failed to create template.",
    });
  }
};

export const getAllTemplates = async (req, res) => {
  try {
    const CertificateTemplate = (await import("../models/CertificateTemplate.js")).default;

    const templates = await CertificateTemplate.find({})
      .sort({ createdAt: -1 });

    return res.status(200).json({
      templates,
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to load templates.",
    });
  }
};

export const updateTemplate = async (req, res) => {
  try {
    const CertificateTemplate = (await import("../models/CertificateTemplate.js")).default;

    const {
      name,
      templateName,
      certificateType,
      htmlContent,
      content,
    } = req.body;

    const updateData = {};

    if (name || templateName) {
      updateData.templateName = name || templateName;
      updateData.title = name || templateName;
    }

    if (certificateType) {
      updateData.certificateType = certificateType;
    }

    if (htmlContent || content) {
      const finalContent = htmlContent || content;
      // Validation: enforce {{fullName}} and balanced brackets
      validateTemplateHtml(finalContent);
      updateData.content = finalContent;
    }

    const template = await CertificateTemplate.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!template) {
      return res.status(404).json({
        message: "Template not found.",
      });
    }

    await logAction({
      req,
      actor: req.user,
      action: 'TEMPLATE_UPDATED',
      targetType: 'certificate_template',
      targetId: template._id,
      meta: { templateName: template.templateName, certificateType: template.certificateType }
    });

    return res.status(200).json({
      message: "Template updated successfully.",
      template,
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      message: err.message || "Failed to update template.",
    });
  }
};

export const toggleTemplateActive = async (req, res) => {
  try {
    const CertificateTemplate = (await import("../models/CertificateTemplate.js")).default;

    const template = await CertificateTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        message: "Template not found.",
      });
    }

    template.status =
      template.status === "active" ? "inactive" : "active";

    await template.save();

    await logAction({
      req,
      actor: req.user,
      action: 'TEMPLATE_TOGGLED',
      targetType: 'certificate_template',
      targetId: template._id,
      meta: { templateName: template.templateName, status: template.status }
    });

    return res.status(200).json({
      message: "Template status updated successfully.",
      template,
    });
  } catch (err) {
    return res.status(400).json({
      message: err.message || "Failed to update template status.",
    });
  }
};

/**
 * Task C: Retention Policy Endpoints
 */

export const getRetentionPolicy = async (req, res) => {
  try {
    const policy = await RetentionPolicy.getOrCreatePolicy();
    return res.status(200).json({ policy });
  } catch (err) {
    return res.status(500).json({ message: "Failed to retrieve retention policy", error: err.message });
  }
};

export const updateRetentionPolicy = async (req, res) => {
  try {
    let { graceDays, purgeDays } = req.body;
    graceDays = parseInt(graceDays, 10);
    purgeDays = parseInt(purgeDays, 10);

    if (isNaN(graceDays) || graceDays < 1) {
      return res.status(400).json({ message: "graceDays must be an integer of at least 1." });
    }
    if (isNaN(purgeDays) || purgeDays < 1) {
      return res.status(400).json({ message: "purgeDays must be an integer of at least 1." });
    }
    if (purgeDays <= graceDays) {
      return res.status(400).json({ message: "purgeDays must be strictly greater than graceDays." });
    }

    const policy = await RetentionPolicy.getOrCreatePolicy();
    policy.graceDays = graceDays;
    policy.purgeDays = purgeDays;
    policy.updatedBy = req.user.id;
    await policy.save();

    await logAction({
      req,
      actor: req.user,
      action: 'RETENTION_POLICY_UPDATED',
      targetType: 'retention_policy',
      targetId: policy._id,
      meta: { graceDays, purgeDays }
    });

    console.log(`[RetentionPolicy] Policy updated by admin ${req.user.id}: graceDays=${graceDays}, purgeDays=${purgeDays}`);

    return res.status(200).json({
      message: "Retention policy updated successfully",
      policy,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update retention policy", error: err.message });
  }
};

export const getArchivedInterns = async (req, res) => {
  try {
    const policy = await RetentionPolicy.getOrCreatePolicy();
    const interns = await User.find({
      role: "intern",
      isArchived: true,
    })
      .select("fullName email internCode domain startDate endDate archivedAt internshipDetails")
      .sort({ archivedAt: -1 });

    const now = Date.now();
    const formatted = interns.map((intern) => {
      const archivedTime = intern.archivedAt ? new Date(intern.archivedAt).getTime() : now;
      const daysSinceArchived = Math.max(0, Math.floor((now - archivedTime) / (1000 * 60 * 60 * 24)));
      const daysLeftBeforePurge = Math.max(0, policy.purgeDays - daysSinceArchived);

      return {
        _id: intern._id,
        id: intern._id,
        fullName: intern.fullName,
        email: intern.email,
        internCode: intern.internCode,
        domain: intern.domain,
        startDate: intern.startDate,
        endDate: intern.endDate,
        archivedAt: intern.archivedAt,
        daysSinceArchived,
        daysLeftBeforePurge,
        status: intern.internshipDetails?.status || "completed",
      };
    });

    return res.status(200).json({ interns: formatted, policy });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch archived interns", error: err.message });
  }
};

export const restoreArchivedIntern = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid intern ID." });
    }

    const intern = await User.findOne({
      _id: id,
      role: "intern",
    });

    if (!intern) {
      return res.status(404).json({ message: "Intern not found." });
    }

    if (!intern.isArchived) {
      return res.status(400).json({ message: "Intern account is not archived." });
    }

    intern.isArchived = false;
    intern.archivedAt = null;
    intern.archiveWarningSentAt = null;
    await intern.save();

    await logAction({
      req,
      actor: req.user,
      action: 'INTERN_RESTORED',
      targetType: 'user',
      targetId: intern._id,
      meta: { email: intern.email, internCode: intern.internCode }
    });

    console.log(`[Retention] Restored archived intern: ${intern.fullName} (${intern.internCode || intern._id})`);

    return res.status(200).json({
      message: "Intern account restored successfully.",
      user: {
        id: intern._id,
        fullName: intern.fullName,
        email: intern.email,
        internCode: intern.internCode,
        isArchived: intern.isArchived,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to restore intern account", error: err.message });
  }
};

/**
 * Task F: Revoke a certificate
 * PATCH /api/admin/certificates/:id/revoke
 */
export const revokeCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ message: 'Revocation reason is required.' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid certificate ID.' });
    }

    const certificate = await Certificate.findById(id).populate('userId', 'fullName email internCode');
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found.' });
    }

    certificate.isRevoked = true;
    certificate.revokedAt = new Date();
    certificate.revokedBy = req.user.id;
    certificate.revokedReason = reason.trim();
    await certificate.save();

    await logAction({
      req,
      actor: req.user,
      action: 'CERTIFICATE_REVOKED',
      targetType: 'certificate',
      targetId: certificate._id,
      meta: {
        certificateNumber: certificate.certificateNumber,
        reason: certificate.revokedReason,
        internId: certificate.userId?._id || certificate.userId
      }
    });

    const internId = certificate.userId?._id || certificate.userId;
    if (internId) {
      notify(internId, 'CERTIFICATE_REVOKED', {
        title: 'Certificate Revoked',
        message: `Your certificate ${certificate.certificateNumber} has been revoked by administration. Reason: ${certificate.revokedReason}`,
        email: true
      });
    }

    return res.status(200).json({
      message: 'Certificate successfully revoked.',
      certificate
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to revoke certificate.', error: err.message });
  }
};

/**
 * Task F: Unrevoke a certificate
 * PATCH /api/admin/certificates/:id/unrevoke
 */
export const unrevokeCertificate = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid certificate ID.' });
    }

    const certificate = await Certificate.findById(id);
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found.' });
    }

    certificate.isRevoked = false;
    certificate.revokedAt = null;
    certificate.revokedBy = null;
    certificate.revokedReason = null;
    await certificate.save();

    await logAction({
      req,
      actor: req.user,
      action: 'CERTIFICATE_UNREVOKED',
      targetType: 'certificate',
      targetId: certificate._id,
      meta: { certificateNumber: certificate.certificateNumber }
    });

    return res.status(200).json({
      message: 'Certificate revocation reversed.',
      certificate
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to unrevoke certificate.', error: err.message });
  }
};

/**
 * Task D: Helper to build audit logs query filter
 */
const buildAuditFilter = async (query) => {
  const { actor, action, targetType, from, to } = query;
  const filter = {};

  if (action && typeof action === 'string' && action.trim()) {
    filter.action = action.trim();
  }

  if (targetType && typeof targetType === 'string' && targetType.trim()) {
    filter.targetType = targetType.trim();
  }

  if (actor && typeof actor === 'string' && actor.trim()) {
    const actorTrimmed = actor.trim();
    if (actorTrimmed.toLowerCase() === 'system') {
      filter.$or = [{ actorRole: 'system' }, { actorId: null }];
    } else if (mongoose.Types.ObjectId.isValid(actorTrimmed)) {
      filter.actorId = actorTrimmed;
    } else {
      const matchedUsers = await User.find({
        $or: [
          { fullName: new RegExp(actorTrimmed, 'i') },
          { email: new RegExp(actorTrimmed, 'i') }
        ]
      }).select('_id');
      const userIds = matchedUsers.map((u) => u._id);
      filter.$or = [
        { actorId: { $in: userIds } },
        { actorRole: actorTrimmed.toLowerCase() }
      ];
    }
  }

  if (from || to) {
    filter.createdAt = {};
    if (from) {
      const fromDate = new Date(from);
      if (isNaN(fromDate.getTime())) {
        const error = new Error('Invalid "from" date format');
        error.statusCode = 400;
        throw error;
      }
      filter.createdAt.$gte = fromDate;
    }
    if (to) {
      const toDate = new Date(to);
      if (isNaN(toDate.getTime())) {
        const error = new Error('Invalid "to" date format');
        error.statusCode = 400;
        throw error;
      }
      if (typeof to === 'string' && to.length === 10) {
        toDate.setHours(23, 59, 59, 999);
      }
      filter.createdAt.$lte = toDate;
    }
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      if (fromDate > toDate) {
        const error = new Error('"from" date must be before or equal to "to" date');
        error.statusCode = 400;
        throw error;
      }
    }
  }

  return filter;
};

/**
 * Task D: Paginated Audit Logs
 * GET /api/admin/audit-logs
 */
export const getAuditLogs = async (req, res) => {
  try {
    const filter = await buildAuditFilter(req.query);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    let sort = { createdAt: -1 };
    if (req.query.sort) {
      if (req.query.sort === 'createdAt' || req.query.sort === 'asc') sort = { createdAt: 1 };
      else if (req.query.sort === '-createdAt' || req.query.sort === 'desc') sort = { createdAt: -1 };
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('actorId', 'fullName email role')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return res.status(200).json({
      logs,
      page,
      totalPages,
      total
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({ message: err.message || 'Failed to fetch audit logs.' });
  }
};

/**
 * Task D: Export Audit Logs CSV
 * GET /api/admin/audit-logs/export
 */
export const exportAuditLogs = async (req, res) => {
  try {
    const filter = await buildAuditFilter(req.query);

    const logs = await AuditLog.find(filter)
      .populate('actorId', 'fullName email role')
      .sort({ createdAt: -1 })
      .limit(10000)
      .lean();

    // Log the export action itself as EXPORT
    await logAction({
      req,
      actor: req.user,
      action: 'EXPORT',
      targetType: 'audit_logs',
      meta: { filter: req.query, count: logs.length }
    });

    const csvEscape = (field) => {
      if (field === null || field === undefined) return '""';
      const str = typeof field === 'object' ? JSON.stringify(field) : String(field);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = ['Timestamp', 'Actor Name', 'Actor Email', 'Actor Role', 'Action', 'Target Type', 'Target ID', 'IP Address', 'User Agent', 'Metadata'];
    const rows = logs.map((log) => [
      csvEscape(log.createdAt ? new Date(log.createdAt).toISOString() : ''),
      csvEscape(log.actorId?.fullName || (log.actorRole === 'system' ? 'System' : 'Unknown')),
      csvEscape(log.actorId?.email || ''),
      csvEscape(log.actorRole || 'system'),
      csvEscape(log.action),
      csvEscape(log.targetType || ''),
      csvEscape(log.targetId || ''),
      csvEscape(log.ip || ''),
      csvEscape(log.userAgent || ''),
      csvEscape(log.meta ? JSON.stringify(log.meta) : '')
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    return res.status(200).send(csvContent);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({ message: err.message || 'Failed to export audit logs.' });
  }
};

/**
 * Task G Endpoint: GET /api/admin/requests?status=&page=&limit=&domain=&teamLeaderId=
 * Returns filtered list of certificate requests (for analytics chart segment drill-down)
 */
export const getFilteredRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, domain, teamLeaderId } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (domain || teamLeaderId) {
      const internFilter = { role: 'intern' };
      if (domain) internFilter.domain = domain;
      if (teamLeaderId) {
        internFilter.$or = [
          { 'internshipDetails.teamLeaderId': teamLeaderId },
          { 'internshipDetails.teamleaderEmail': teamLeaderId.toLowerCase() }
        ];
      }
      const internIds = await User.find(internFilter).distinct('_id');
      query.userId = { $in: internIds };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [requests, total] = await Promise.all([
      CertificateRequest.find(query)
        .populate('userId', 'fullName email internCode domain internshipDetails')
        .populate('certificateId', 'certificateNumber status pdfPath issuedDate')
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      CertificateRequest.countDocuments(query)
    ]);

    return res.status(200).json({
      requests,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      limit: limitNum
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};