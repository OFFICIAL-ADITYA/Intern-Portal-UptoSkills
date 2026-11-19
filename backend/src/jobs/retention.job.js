import cron from 'node-cron';
import User from '../models/User.js';
import RetentionPolicy from '../models/RetentionPolicy.model.js';
import { sendEmail } from '../utils/sendEmail.js';
import { logAction } from '../utils/logAction.js';
import { notify } from '../services/notification.service.js';

/**
 * Executes the Data Retention & Archival Job:
 * 1. Warning Email: Send warning email 7 days before archival
 * 2. Archive: Completed interns where endDate + graceDays < today -> isArchived = true, archivedAt = now
 * 3. Purge: Archived interns where archivedAt + purgeDays < today -> Anonymize personal info, keep certificates intact
 *
 * Safety rules:
 * - Supports DRY_RUN=true env option (or dryRun parameter)
 * - Processes in batches of 100
 * - Logs each action to console with // TODO: logAction at each action
 *
 * @param {Object} options
 * @param {boolean} [options.dryRun]
 * @returns {Promise<{ warningsSent: number, archivedCount: number, purgedCount: number }>}
 */
export const runRetentionJob = async (options = {}) => {
  const isDryRun = process.env.DRY_RUN === 'true' || options.dryRun === true;
  console.log(`[Job:retention] Starting retention job${isDryRun ? ' [DRY-RUN MODE]' : ''}...`);

  const policy = await RetentionPolicy.getOrCreatePolicy();
  const graceDays = policy.graceDays || 30;
  const purgeDays = policy.purgeDays || 90;

  const now = new Date();
  const nowMs = now.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const batchSize = 100;

  let warningsSent = 0;
  let archivedCount = 0;
  let purgedCount = 0;

  // --------------------------------------------------------------------------
  // STEP 1: Send warning email 7 days before archival
  // Target archival is: endDate + graceDays.
  // 7 days before archival is: endDate + (graceDays - 7) days <= now < endDate + graceDays
  // --------------------------------------------------------------------------
  let skip = 0;
  while (true) {
    const candidates = await User.find({
      role: 'intern',
      isArchived: { $ne: true },
      'internshipDetails.status': 'completed',
      archiveWarningSentAt: null,
      endDate: { $exists: true, $ne: null },
    })
      .skip(skip)
      .limit(batchSize);

    if (!candidates.length) break;

    for (const intern of candidates) {
      if (!intern.endDate) continue;
      const endMs = new Date(intern.endDate).getTime();
      const archivalTargetMs = endMs + graceDays * dayMs;
      const warningWindowStartMs = archivalTargetMs - 7 * dayMs;

      // Check if current time has reached the 7-day warning window before archival
      if (nowMs >= warningWindowStartMs && nowMs < archivalTargetMs) {
        warningsSent++;
        const daysRemaining = Math.max(1, Math.ceil((archivalTargetMs - nowMs) / dayMs));
        console.log(
          `[Job:retention] [Warning Email] Sending 7-day archival notice to intern ${intern.fullName} (${intern.email}) - ~${daysRemaining} days left`
        );

        if (!isDryRun) {
          try {
            // Task C's 7-day archive warning routed through notification service
            await notify(intern._id, 'ARCHIVE_WARNING', {
              title: 'Notice: Your UPTOSKILL intern account will be archived soon',
              message: `Your internship concluded on ${new Date(intern.endDate).toLocaleDateString()}. In accordance with our data retention policy, your intern account is scheduled to be archived in approximately ${daysRemaining} day(s). During the remaining grace period, you can still log in to view and download any finalized certificates.`,
              email: true
            });
          } catch (mailErr) {
            console.error(`[Job:retention] Failed to send warning notification to ${intern.email}:`, mailErr.message);
          }

          intern.archiveWarningSentAt = new Date();
          await intern.save();

          await logAction({
            actor: 'system',
            action: 'ACCOUNT_ARCHIVE_WARNING',
            targetType: 'user',
            targetId: intern._id,
            meta: { daysRemaining }
          });
        }
      }
    }

    if (candidates.length < batchSize) break;
    skip += batchSize;
  }

  // --------------------------------------------------------------------------
  // STEP 2: Archive completed interns where endDate + graceDays < today
  // --------------------------------------------------------------------------
  skip = 0;
  while (true) {
    const completedInterns = await User.find({
      role: 'intern',
      isArchived: { $ne: true },
      'internshipDetails.status': 'completed',
      endDate: { $exists: true, $ne: null },
    })
      .skip(skip)
      .limit(batchSize);

    if (!completedInterns.length) break;

    for (const intern of completedInterns) {
      if (!intern.endDate) continue;
      const endMs = new Date(intern.endDate).getTime();
      const archivalTargetMs = endMs + graceDays * dayMs;

      if (nowMs > archivalTargetMs) {
        archivedCount++;
        console.log(
          `[Job:retention] [Archive] Archiving intern account: ${intern.fullName} (${intern.internCode || intern._id}) - endDate=${intern.endDate?.toISOString()}`
        );

        if (!isDryRun) {
          intern.isArchived = true;
          intern.archivedAt = new Date();
          await intern.save();

          await logAction({
            actor: 'system',
            action: 'INTERN_ARCHIVED',
            targetType: 'user',
            targetId: intern._id,
            meta: { fullName: intern.fullName, internCode: intern.internCode, endDate: intern.endDate }
          });
        }
      }
    }

    if (completedInterns.length < batchSize) break;
    skip += batchSize;
  }

  // --------------------------------------------------------------------------
  // STEP 3: Purge archived interns where archivedAt + purgeDays < today
  // Anonymize personal info (name, email, mobile, internCode), keep certificates
  // --------------------------------------------------------------------------
  skip = 0;
  while (true) {
    const archivedInterns = await User.find({
      role: 'intern',
      isArchived: true,
      isPurged: { $ne: true },
      archivedAt: { $exists: true, $ne: null },
      email: { $not: /^purged_/ }, // Not already purged
    })
      .skip(skip)
      .limit(batchSize);

    if (!archivedInterns.length) break;

    for (const intern of archivedInterns) {
      const archivedMs = new Date(intern.archivedAt).getTime();
      const purgeTargetMs = archivedMs + purgeDays * dayMs;

      if (nowMs > purgeTargetMs) {
        purgedCount++;
        console.log(
          `[Job:retention] [Purge] Anonymizing personal data for archived intern: ${intern.fullName} (ID: ${intern._id})`
        );

        if (!isDryRun) {
          const anonymizedId = intern._id.toString();
          intern.fullName = 'Anonymized Intern';
          intern.email = `purged_${anonymizedId}@deleted.local`;
          intern.mobileNo = '0000000000';
          intern.internCode = `PURGED-${anonymizedId.slice(-6)}`;
          intern.isPurged = true;
          intern.purgedAt = new Date();
          await intern.save();

          await logAction({
            actor: 'system',
            action: 'INTERN_PURGED',
            targetType: 'user',
            targetId: intern._id,
            meta: { originalId: intern._id }
          });
        }
      }
    }

    if (archivedInterns.length < batchSize) break;
    skip += batchSize;
  }

  console.log(
    `[Job:retention] Finished: ${warningsSent} warning notice(s), ${archivedCount} intern(s) archived, ${purgedCount} intern(s) purged/anonymized.${isDryRun ? ' (No database writes in dry-run)' : ''}`
  );

  return { warningsSent, archivedCount, purgedCount, isDryRun };
};

// Schedule node-cron daily at 2:00 AM
export const scheduleRetentionCron = () => {
  return cron.schedule('0 2 * * *', async () => {
    try {
      await runRetentionJob();
    } catch (err) {
      console.error('[Job:retention] Scheduled job failed:', err);
    }
  });
};

export default { runRetentionJob, scheduleRetentionCron };
