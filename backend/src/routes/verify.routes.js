import { Router } from 'express';
import Certificate from '../models/Certificate.js';
import { mapCertificateTitle } from '../services/certificate.service.js';
import { verifyLimiter } from '../middlewares/rateLimiter.js';

const verifyRouter = Router();

const notFoundResponse = (res) => res.status(404).json({ message: 'Certificate not found' });

/**
 * Public Certificate Verification Endpoint
 * GET /api/verify/:verifyId
 */
verifyRouter.get('/:verifyId', verifyLimiter, async (req, res) => {
  try {
    const { verifyId } = req.params;

    if (!verifyId || typeof verifyId !== 'string' || verifyId.trim().length < 6 || verifyId.trim().length > 64) {
      return notFoundResponse(res);
    }

    const trimmedId = verifyId.trim();

    // Find certificate by verifyId (or fallback to verificationCode if legacy)
    const cert = await Certificate.findOne({
      $or: [
        { verifyId: trimmedId },
        { verificationCode: trimmedId }
      ],
      status: { $in: ['finalized', 'issued', 'revoked'] }
    }).lean();

    if (!cert) {
      return notFoundResponse(res);
    }

    const isRevoked = cert.isRevoked === true || cert.status === 'revoked';

    // Strict public projection: never return email, internCode, mobile, or internal IDs
    const publicData = {
      certificateNumber: cert.certificateNumber,
      recipientName: cert.recipientName || '',
      certificateTitle: cert.certificateTitle || mapCertificateTitle(cert.certificateType),
      domain: cert.domain || '',
      issuedAt: cert.issuedAt || cert.issuedDate || cert.createdAt,
      status: isRevoked ? 'revoked' : 'valid'
    };

    if (isRevoked) {
      publicData.revokedAt = cert.revokedAt || cert.updatedAt || null;
    }

    return res.status(200).json(publicData);
  } catch (error) {
    return notFoundResponse(res);
  }
});

export default verifyRouter;
