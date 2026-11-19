import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Handlebars from 'handlebars';

Handlebars.registerHelper('json', (value) => JSON.stringify(value ?? ''));
import puppeteer from 'puppeteer';
import crypto from 'crypto';
import QRCode from 'qrcode';
import Certificate from '../models/Certificate.js';
import CertificateRequest from '../models/CertificateRequest.js';
import CertificateTemplate from '../models/CertificateTemplate.js';
import Counter from '../models/Counter.model.js';
import { sendEmail } from '../utils/sendEmail.js';
import { logAction } from '../utils/logAction.js';
import { notify } from './notification.service.js';

export const generateCertificateNumber = async () => {
  const year = new Date().getFullYear();
  if (Counter.db?.readyState === 1) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { _id: 'certificateNumber' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      if (counter && counter.seq) {
        return `UTS-${year}-${String(counter.seq).padStart(6, '0')}`;
      }
    } catch {
      // Fallback below
    }
  }

  // Safe fallback if Counter is not accessible or DB is mocked in unit tests
  let count = await Certificate.countDocuments();
  let candidate = `UTS-${year}-${String(count + 1).padStart(6, '0')}`;
  while (await Certificate.exists({ certificateNumber: candidate })) {
    count += 1;
    candidate = `UTS-${year}-${String(count + 1).padStart(6, '0')}`;
  }
  return candidate;
};

export const generateVerifyId = () => {
  return crypto.randomBytes(6).toString('hex');
};

const generateVerificationCode = () => {
  return `VER-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
};

const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

/**
 * Maps certificateType to human-readable Certificate Title
 * e.g. completion_certificate -> "Internship Completion"
 *
 * @param {string} certificateType
 * @returns {string}
 */
export const mapCertificateTitle = (certificateType) => {
  const map = {
    offer_letter: 'Internship Offer Letter',
    bonafide: 'Bonafide Certificate',
    ojt_certificate: 'On-the-Job Training Certificate',
    experience_letter: 'Experience Letter',
    experience_letter_detailed: 'Detailed Experience Letter',
    completion_certificate: 'Internship Completion',
    intern_of_month: 'Intern of the Month',
    league_winner: 'League Winner Certificate',
    custom: 'Certificate of Achievement'
  };
  return map[certificateType] || (certificateType || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatDuration = (startDate, endDate) => {
  if (!startDate || !endDate) return '';
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return '';

  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  const anchor = new Date(start);
  anchor.setMonth(anchor.getMonth() + Math.max(months, 0));
  const days = Math.max(0, Math.round((end - anchor) / 86400000));

  if (months > 0 && days > 0) return `${months} Months ${days} Days`;
  if (months > 0) return months === 1 ? '1 Month' : `${months} Months`;
  return days === 1 ? '1 Day' : `${days} Days`;
};

/**
 * Ensures the QR verification code image is embedded in the certificate HTML.
 * Handles:
 * 1. Token replacement for {{qrCodeUrl}} and {{QRCodeUrl}}
 * 2. Injection into .qr-placeholder-box
 * 3. Injection into .emerald-qr-placeholder
 *
 * @param {string} html
 * @param {string} qrCodeDataUrl
 * @param {string} [certNumber]
 * @returns {string}
 */
export const ensureQrCodeInHtml = (html, qrCodeDataUrl, certNumber = '') => {
  if (!html || typeof html !== 'string') return html;

  let updated = html;
  if (qrCodeDataUrl) {
    updated = updated.replaceAll('{{qrCodeUrl}}', qrCodeDataUrl);
    updated = updated.replaceAll('{{QRCodeUrl}}', qrCodeDataUrl);

    // If template has .qr-placeholder-box and does not yet contain this data URL
    if (updated.includes('qr-placeholder-box') && !updated.includes(qrCodeDataUrl)) {
      updated = updated.replace(
        /(<div[^>]*class=["'][^"']*qr-placeholder-box[^"']*["'][^>]*>)([\s\S]*?)(<\/div>)/gi,
        `$1<img class="qr-code-img" src="${qrCodeDataUrl}" alt="Scan to Verify" style="width:100%;height:100%;object-fit:contain;display:block;" />$3`
      );
    }

    // If template has .emerald-qr-placeholder and does not yet contain this data URL
    if (updated.includes('emerald-qr-placeholder') && !updated.includes(qrCodeDataUrl)) {
      updated = updated.replace(
        /(<div[^>]*class=["'][^"']*emerald-qr-placeholder[^"']*["'][^>]*>)([\s\S]*?)(<\/div>)/gi,
        `$1<img class="qr-code-img" src="${qrCodeDataUrl}" alt="Scan to Verify" style="width:100%;height:100%;object-fit:contain;display:block;" />$3`
      );
    }
  }

  if (certNumber) {
    updated = updated.replaceAll('{{certificateNumber}}', certNumber);
    updated = updated.replaceAll('{{CertificateNumber}}', certNumber);
  }

  return updated;
};

/**
 * Creates a certificate draft for an approved CertificateRequest.
 * Enforces duplicate draft protection and uses the matching active CertificateTemplate.
 *
 * @param {string|mongoose.Types.ObjectId} requestId
 * @returns {Promise<Certificate>}
 */
export const createCertificateDraft = async (requestId) => {
  const request = await CertificateRequest.findById(requestId).populate('userId');
  if (!request) {
    const error = new Error('Certificate request not found');
    error.statusCode = 404;
    throw error;
  }

  // Duplicate draft protection: return existing certificate if one was already linked
  if (request.certificateId) {
    const existingCert = await Certificate.findById(request.certificateId);
    if (existingCert) {
      return existingCert;
    }
  }

  const user = request.userId;
  if (!user) {
    const error = new Error('Associated intern not found for this request');
    error.statusCode = 404;
    throw error;
  }

  // Must use the matching active CertificateTemplate (no fallback template)
  const template = await CertificateTemplate.findOne({
    certificateType: request.certificateType,
    status: 'active'
  });

  if (!template) {
    const error = new Error(`No active certificate template found for type: ${request.certificateType}`);
    error.statusCode = 404;
    throw error;
  }

  if (!template.content) {
    const error = new Error(`Certificate template for type '${request.certificateType}' does not contain content`);
    error.statusCode = 400;
    throw error;
  }

  const certificateNumber = await generateCertificateNumber();
  const verifyId = generateVerifyId();
  const verificationCode = generateVerificationCode();

  const formattedCertType = (request.certificateType || '').replace(/_/g, ' ');
  const certificateTitle = mapCertificateTitle(request.certificateType);

  const issueDate = new Date();
  const startDate = formatDate(user.startDate);
  const endDate = formatDate(user.endDate);
  const duration = formatDuration(user.startDate, user.endDate);
  const domain = user.domain || '';
  const teamLeader = user.internshipDetails?.teamleaderEmail || '';
  const organizationName = 'UptoSkills';
  const position = domain ? `${domain} Intern` : 'Intern';

  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const verificationURL = `${frontendUrl}/verify/${verifyId}`;
  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(verificationURL, { margin: 1, width: 256 });
  } catch (qrErr) {
    console.error('Failed to generate QR code data URL:', qrErr.message);
  }

  const templateData = {
    InternName: user.fullName || '',
    internName: user.fullName || '',
    fullName: user.fullName || '',
    name: user.fullName || '',
    CertificateNumber: certificateNumber,
    certificateNumber: certificateNumber,
    OfferNumber: certificateNumber,
    ReferenceID: certificateNumber,
    requestNumber: request.requestNumber || certificateNumber,
    RequestNumber: request.requestNumber || certificateNumber,
    certificateTitle,
    CertificateTitle: certificateTitle,
    Department: domain,
    DepartmentName: domain,
    department: domain,
    domain,
    Domain: domain,
    ProgramName: domain,
    AcademicYear: user.startDate && user.endDate ? `${new Date(user.startDate).getFullYear()}-${new Date(user.endDate).getFullYear()}` : '',
    Purpose: 'Internship / Academic Purpose',
    Position: position,
    InternPosition: position,
    startDate,
    StartDate: startDate,
    endDate,
    EndDate: endDate,
    Duration: duration,
    duration,
    IssueDate: formatDate(issueDate),
    issueDate: formatDate(issueDate),
    InternCode: user.internCode || '',
    internCode: user.internCode || '',
    CertificateType: formattedCertType,
    certificateType: formattedCertType,
    rawCertificateType: request.certificateType || '',
    VerificationCode: verificationCode,
    verificationCode: verificationCode,
    VerificationURL: verificationURL,
    verificationURL: verificationURL,
    verifyUrl: verificationURL,
    qrCodeUrl: qrCodeDataUrl || verificationURL,
    QRCodeUrl: qrCodeDataUrl || verificationURL,
    verifyId,
    OrganizationName: organizationName,
    organizationName,
    Place: '',
    place: '',
    MentorName: '',
    mentorName: '',
    HRName: '',
    hrName: '',
    HRSignature: '',
    hrSignature: '',
    ManagerName: teamLeader,
    ReportingManager: teamLeader,
    reportingManager: teamLeader,
    WorkMode: '',
    Mode: '',
    Location: '',
    Stipend: '',
    AuthorizedName: '',
    AuthorizedPersonName: '',
    AuthorizedPerson: '',
    AuthorizedPosition: '',
    Designation: '',
    AuthorizedSignature: '',
    CompanyEmail: '',
    CompanyPhone: '',
    CompanyWebsite: 'uptoskills.com',
    CompanyAddress: '',
    LeagueName: '',
    Organizer: organizationName,
    Month: issueDate.toLocaleDateString('en-US', { month: 'long' }),
    Year: String(issueDate.getFullYear()),
    signatureOrganization: organizationName,
    termsOrganization: organizationName,
    closingOrganization: organizationName
  };

  const compiledTemplate = Handlebars.compile(template.content);
  let htmlContent = compiledTemplate(templateData);

  // Guarantee the QR code image is populated in HTML
  htmlContent = ensureQrCodeInHtml(htmlContent, qrCodeDataUrl, certificateNumber);

  const certificate = await Certificate.create({
    certificateNumber,
    userId: user._id,
    internCode: user.internCode,
    templateId: template._id,
    certificateType: request.certificateType,
    domain: user.domain,
    startDate: user.startDate,
    endDate: user.endDate,
    issuedDate: issueDate,
    status: 'draft',
    htmlContent,
    verificationCode,
    verifyId,
    recipientName: user.fullName || '',
    certificateTitle,
    issuedAt: issueDate,
    generatedBy: request.reviewedBy
  });

  request.certificateId = certificate._id;
  await request.save();

  logAction({
    actor: request.reviewedBy || 'system',
    action: 'CERTIFICATE_DRAFT_CREATED',
    targetType: 'certificate',
    targetId: certificate._id,
    meta: { certificateNumber, requestId: request._id }
  });
  await request.save();

  return certificate;
};

/**
 * Fetches a Certificate draft by its Certificate ID.
 *
 * @param {string} id - Certificate ID
 * @returns {Promise<Certificate>}
 */
export const getCertificateDraft = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error('Invalid certificate ID');
    error.statusCode = 400;
    throw error;
  }

  const certificate = await Certificate.findById(id).populate('userId', 'fullName email internCode domain');
  if (!certificate) {
    const error = new Error('Certificate draft not found');
    error.statusCode = 404;
    throw error;
  }

  return certificate;
};

/**
 * Updates the htmlContent of a draft Certificate.
 * Only allows editing if certificate.status is 'draft'.
 *
 * @param {string} id - Certificate ID
 * @param {string} htmlContent - Updated HTML string
 * @returns {Promise<Certificate>}
 */
export const updateCertificateDraft = async (id, htmlContent) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error('Invalid certificate ID');
    error.statusCode = 400;
    throw error;
  }

  if (typeof htmlContent !== 'string' || !htmlContent.trim()) {
    const error = new Error('htmlContent is required');
    error.statusCode = 400;
    throw error;
  }

  const certificate = await Certificate.findById(id);
  if (!certificate) {
    const error = new Error('Certificate draft not found');
    error.statusCode = 404;
    throw error;
  }

  if (certificate.status !== 'draft') {
    const error = new Error('Only draft certificates can be edited');
    error.statusCode = 400;
    throw error;
  }

  certificate.htmlContent = htmlContent;
  await certificate.save();

  logAction({
    action: 'CERTIFICATE_EDITED',
    targetType: 'certificate',
    targetId: certificate._id,
    meta: { certificateNumber: certificate.certificateNumber }
  });

  return certificate;
};

// Singleton shared Puppeteer browser instance for reuse
let sharedBrowser = null;

const findSystemChrome = () => {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  const candidatePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];

  for (const p of candidatePaths) {
    if (p && fs.existsSync(p)) {
      return p;
    }
  }
  return undefined;
};

const getSharedBrowser = async () => {
  if (!sharedBrowser || !sharedBrowser.connected) {
    const launchOptions = {
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    };

    try {
      sharedBrowser = await puppeteer.launch(launchOptions);
    } catch (err) {
      const systemChrome = findSystemChrome();
      if (systemChrome) {
        sharedBrowser = await puppeteer.launch({
          ...launchOptions,
          executablePath: systemChrome
        });
      } else {
        throw err;
      }
    }
  }
  return sharedBrowser;
};

/**
 * Renders HTML to a high-quality PDF buffer using Puppeteer.
 * Settings: format: 'A4', landscape: true, printBackground: true, zero margins.
 * Waits for fonts (document.fonts.ready) and reuses a single browser instance.
 *
 * @param {string} htmlContent - Full HTML markup to render
 * @returns {Promise<Buffer>}
 */
export const renderCertificatePdf = async (htmlContent) => {
  if (!htmlContent || typeof htmlContent !== 'string' || !htmlContent.trim()) {
    const error = new Error('Certificate htmlContent is required for PDF rendering');
    error.statusCode = 400;
    throw error;
  }

  let page = null;
  try {
    const browser = await getSharedBrowser();
    page = await browser.newPage();
    await page.setContent(htmlContent, {
      waitUntil: ['load', 'networkidle0']
    });

    // Wait for fonts to finish loading before rendering PDF
    try {
      await page.evaluateHandle('document.fonts.ready');
    } catch {
      // Safe fallback if document.fonts is not supported
    }

    const pdfBytes = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });

    return Buffer.from(pdfBytes);
  } catch (err) {
    const error = new Error(`PDF rendering failed: ${err.message}`);
    error.statusCode = 500;
    throw error;
  } finally {
    if (page) {
      try {
        await page.close();
      } catch {
        // Safe disposal of page
      }
    }
  }
};

/**
 * Finalizes a Certificate draft:
 * 1. Validates status is draft and htmlContent exists
 * 2. Renders PDF with Puppeteer
 * 3. Persists PDF to local storage
 * 4. Sets Certificate.status = "finalized"
 * 5. Updates linked CertificateRequest.status = "completed"
 *
 * @param {string} certificateId
 * @returns {Promise<{certificate: Certificate, request: CertificateRequest, absolutePdfPath: string, fileName: string}>}
 */
export const finalizeCertificate = async (certificateId) => {
  if (!mongoose.Types.ObjectId.isValid(certificateId)) {
    const error = new Error('Invalid certificate ID');
    error.statusCode = 400;
    throw error;
  }

  const certificate = await Certificate.findById(certificateId).populate('userId', 'fullName email internCode domain');
  if (!certificate) {
    const error = new Error('Certificate not found');
    error.statusCode = 404;
    throw error;
  }

  if (certificate.status !== 'draft') {
    const error = new Error(`Cannot finalize certificate with status '${certificate.status}'. Only draft certificates can be finalized.`);
    error.statusCode = 409;
    throw error;
  }

  if (!certificate.htmlContent || !certificate.htmlContent.trim()) {
    const error = new Error('Certificate htmlContent is missing or empty');
    error.statusCode = 400;
    throw error;
  }

  // Ensure verifyId and snapshot fields exist
  if (!certificate.verifyId) {
    certificate.verifyId = generateVerifyId();
  }
  if (!certificate.recipientName) {
    certificate.recipientName = certificate.userId?.fullName || '';
  }
  if (!certificate.certificateTitle) {
    certificate.certificateTitle = mapCertificateTitle(certificate.certificateType);
  }
  if (!certificate.domain) {
    certificate.domain = certificate.userId?.domain || certificate.domain || '';
  }
  if (!certificate.issuedAt) {
    certificate.issuedAt = certificate.issuedDate || new Date();
  }

  // Generate verify URL & base64 PNG data URI for QR code
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const verifyUrl = `${frontendUrl}/verify/${certificate.verifyId}`;
  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 256 });
  } catch (qrErr) {
    console.error('Failed to generate QR data URI:', qrErr.message);
  }

  // Substitute {{qrCodeUrl}} and {{certificateNumber}} in htmlContent and guarantee QR code element
  let finalHtml = ensureQrCodeInHtml(certificate.htmlContent, qrCodeDataUrl, certificate.certificateNumber);
  certificate.htmlContent = finalHtml;

  // 1. Render PDF using Puppeteer
  const pdfBuffer = await renderCertificatePdf(certificate.htmlContent);

  // 2. Persist to storage (backend/uploads/certificates)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const uploadDir = path.resolve(__dirname, '../../uploads/certificates');
  fs.mkdirSync(uploadDir, { recursive: true });

  const sanitizedNum = certificate.certificateNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${sanitizedNum}.pdf`;
  const absolutePdfPath = path.join(uploadDir, fileName);
  const relativePdfPath = `uploads/certificates/${fileName}`;

  try {
    fs.writeFileSync(absolutePdfPath, pdfBuffer);
  } catch (fsErr) {
    const error = new Error(`Failed to persist certificate PDF: ${fsErr.message}`);
    error.statusCode = 500;
    throw error;
  }

  // 3. Mark Certificate as finalized and save pdfPath
  certificate.status = 'finalized';
  certificate.pdfPath = relativePdfPath;
  await certificate.save();

  // 4. Update linked CertificateRequest to completed
  const request = await CertificateRequest.findOne({ certificateId: certificate._id });
  if (request) {
    request.status = 'completed';
    await request.save();
  }

  logAction({
    action: 'CERTIFICATE_FINALIZED',
    targetType: 'certificate',
    targetId: certificate._id,
    meta: { certificateNumber: certificate.certificateNumber }
  });

  // Task E: In-app notification to intern only (PDF email already goes out)
  const internUserId = certificate.userId?._id || certificate.userId;
  if (internUserId) {
    notify(internUserId, 'CERTIFICATE_SENT', {
      title: 'Certificate Finalized',
      message: `Your ${certificate.certificateTitle || 'Certificate'} (${certificate.certificateNumber}) has been finalized and issued.`,
      requestId: request?._id || null,
      email: false
    });
  }

  return {
    certificate,
    request,
    absolutePdfPath,
    fileName
  };
};

/**
 * Sends the finalized certificate PDF as an email attachment to the intern.
 *
 * @param {Object} params
 * @param {Certificate} params.certificate
 * @param {string} params.absolutePdfPath
 * @param {User} params.user
 */
export const sendCertificateEmail = async ({ certificate, absolutePdfPath, user }) => {
  const recipientEmail = user?.email;
  if (!recipientEmail) {
    throw new Error('Associated intern email address not found on user record');
  }

  const certificateTypeFormatted = (certificate.certificateType || 'Internship').replace(/_/g, ' ');
  const subject = `Your ${certificateTypeFormatted} Certificate - UPTOSKILL (${certificate.certificateNumber})`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
      <h2 style="color: #2563eb;">Congratulations, ${user.fullName || 'Intern'}!</h2>
      <p>We are pleased to inform you that your <strong>${certificateTypeFormatted}</strong> certificate has been officially reviewed and finalized.</p>
      <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 4px 0;"><strong>Certificate Number:</strong> ${certificate.certificateNumber}</p>
        <p style="margin: 4px 0;"><strong>Verification Code:</strong> ${certificate.verificationCode}</p>
        <p style="margin: 4px 0;"><strong>Issue Date:</strong> ${new Date(certificate.issuedDate || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <p>Your official digital certificate is attached to this email as a PDF document.</p>
      <p style="margin-top: 30px; font-size: 13px; color: #6b7280;">Best regards,<br/><strong>UPTOSKILL Certificate Desk</strong></p>
    </div>
  `;

  const fileName = `${certificate.certificateNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

  return sendEmail({
    to: recipientEmail,
    subject,
    html,
    attachments: [
      {
        filename: fileName,
        path: absolutePdfPath
      }
    ]
  });
};
