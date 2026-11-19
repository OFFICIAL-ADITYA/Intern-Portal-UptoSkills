import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import verifyAuth from '../middlewares/verifyAuth.js';
import Certificate from '../models/Certificate.js';

const certificateRouter = express.Router();

/**
 * Task I: Authenticated certificate download
 * GET /api/certificates/:id/download
 * Validates that user is logged in, and either owns the certificate or is an admin.
 */
certificateRouter.get('/:id/download', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid certificate ID.' });
    }

    const certificate = await Certificate.findById(id);
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found.' });
    }

    // Role check: Only admin or the certificate recipient can download
    const isOwner = certificate.userId && String(certificate.userId) === String(req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied: You do not have permission to download this certificate.' });
    }

    if (!certificate.pdfPath) {
      return res.status(404).json({ message: 'Certificate PDF path is missing.' });
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const absolutePath = path.resolve(__dirname, '../../', certificate.pdfPath);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: 'Certificate PDF file is unavailable on server.' });
    }

    const safeFileName = `${(certificate.certificateNumber || 'Certificate').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    return res.download(absolutePath, safeFileName);
  } catch (err) {
    return res.status(500).json({ message: 'Server error while downloading certificate.', error: err.message });
  }
});

export default certificateRouter;
