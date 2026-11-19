import connectToDB from '../src/config/database.js';
import User from '../src/models/User.js';

export const backfillTeamLeaderId = async () => {
  console.log('[Backfill TL] Connecting to database...');
  await connectToDB();

  const interns = await User.find({ role: 'intern' });
  console.log(`[Backfill TL] Found ${interns.length} interns to inspect.`);

  let updatedCount = 0;
  let alreadySetCount = 0;
  let unmatchedCount = 0;

  // Pre-load all team leaders for fast lookup
  const teamLeaders = await User.find({ role: 'teamleader' }).select('_id email fullName');
  const tlMap = new Map();
  for (const tl of teamLeaders) {
    if (tl.email) {
      tlMap.set(tl.email.trim().toLowerCase(), tl);
    }
  }

  for (const intern of interns) {
    const rawEmail = intern.internshipDetails?.teamleaderEmail;
    if (!rawEmail) {
      console.warn(`[Backfill TL] Warning: Intern ${intern.fullName} (${intern.email || intern._id}) has no teamleaderEmail.`);
      unmatchedCount++;
      continue;
    }

    const normalizedEmail = rawEmail.trim().toLowerCase();
    const tl = tlMap.get(normalizedEmail);

    if (!tl) {
      console.warn(`[Backfill TL] Warning: No team leader found matching email "${rawEmail}" for intern ${intern.fullName} (${intern.email || intern._id}).`);
      unmatchedCount++;
      continue;
    }

    if (String(intern.internshipDetails?.teamLeaderId) === String(tl._id)) {
      alreadySetCount++;
      continue;
    }

    intern.internshipDetails = {
      ...(intern.internshipDetails || {}),
      teamLeaderId: tl._id,
      teamleaderEmail: tl.email.toLowerCase(),
    };

    await intern.save();
    updatedCount++;
  }

  console.log(`[Backfill TL] Complete. Updated: ${updatedCount}, Already set: ${alreadySetCount}, Unmatched: ${unmatchedCount}`);
};

if (process.argv[1] && process.argv[1].endsWith('backfillTeamLeaderId.js')) {
  backfillTeamLeaderId()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Backfill TL] Fatal error:', err);
      process.exit(1);
    });
}
