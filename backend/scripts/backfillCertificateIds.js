import crypto from 'crypto';
import connectToDB from '../src/config/database.js';
import Certificate from '../src/models/Certificate.js';
import Counter from '../src/models/Counter.model.js';
import User from '../src/models/User.js';
import { mapCertificateTitle } from '../src/services/certificate.service.js';

export const backfillCertificateIds = async () => {
  console.log('[Backfill] Connecting to database...');
  await connectToDB();

  const certificates = await Certificate.find({}).populate('userId', 'fullName email domain');
  console.log(`[Backfill] Found ${certificates.length} certificates to inspect.`);

  let updatedCount = 0;
  const year = new Date().getFullYear();

  for (const cert of certificates) {
    let modified = false;

    // 1. Assign verifyId if missing
    if (!cert.verifyId) {
      cert.verifyId = crypto.randomBytes(6).toString('hex');
      modified = true;
    }

    // 2. Assign snapshot fields if missing
    if (!cert.recipientName) {
      cert.recipientName = cert.userId?.fullName || 'Intern';
      modified = true;
    }

    if (!cert.certificateTitle) {
      cert.certificateTitle = mapCertificateTitle(cert.certificateType);
      modified = true;
    }

    if (!cert.domain) {
      cert.domain = cert.userId?.domain || '';
      modified = true;
    }

    if (!cert.issuedAt) {
      cert.issuedAt = cert.issuedDate || cert.createdAt || new Date();
      modified = true;
    }

    // 3. Assign certificateNumber if missing
    if (!cert.certificateNumber) {
      const counter = await Counter.findOneAndUpdate(
        { _id: 'certificateNumber' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      cert.certificateNumber = `UTS-${year}-${String(counter.seq).padStart(6, '0')}`;
      modified = true;
    }

    if (modified) {
      await cert.save();
      updatedCount++;
      console.log(`[Backfill] Updated certificate ${cert._id}: number=${cert.certificateNumber}, verifyId=${cert.verifyId}`);
    }
  }

  console.log(`[Backfill] Completed. Updated ${updatedCount} of ${certificates.length} certificates.`);
};

// If run directly from CLI
if (process.argv[1] && process.argv[1].endsWith('backfillCertificateIds.js')) {
  backfillCertificateIds()
    .then(() => {
      console.log('[Backfill] Finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Backfill] Error:', err);
      process.exit(1);
    });
}

export default backfillCertificateIds;
