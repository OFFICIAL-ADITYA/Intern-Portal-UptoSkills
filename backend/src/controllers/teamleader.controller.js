import User from '../models/User.js';
import { generateInternCode } from '../utils/generateInternCode.js';
import CertificateRequest from '../models/CertificateRequest.js';
import Notification from '../models/Notification.model.js';
import { logAction } from '../utils/logAction.js';
import { notify } from '../services/notification.service.js';
import { clearAnalyticsCache } from './adminAnalytics.controller.js';

export async function createIntern(req, res) {
	try {
		const { fullName, email, mobileNo, domain, startDate, endDate } = req.body;
		const teamLeader = await User.findById(req.user.id).select('email role');

		if (!teamLeader || teamLeader.role !== 'teamleader') {
			return res.status(403).json({ message: 'Team leader access required' });
		}

		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return res.status(409).json({ message: 'user already exists' });
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
			role: 'intern',
			password: internCode,
			internshipDetails: {
				teamLeaderId: teamLeader._id,
				teamleaderEmail: teamLeader.email.toLowerCase(),
				status: 'ongoing',
				createdBy: teamLeader._id,
			},
		});

		return res.status(201).json({
			message: 'Intern created successfully',
			user: { id: user._id, email: user.email },
		});
	} catch (error) {
		return res.status(500).json({ message: 'internal server error' });
	}
}

export async function getInternsForTL(req, res) {
	try {
		const leaderEmail = req.user.email ? req.user.email.toLowerCase() : '__no_email__';
		const interns = await User.find({
			role: 'intern',
			$or: [
				{ 'internshipDetails.teamLeaderId': req.user.id },
				{ 'internshipDetails.teamleaderEmail': leaderEmail }
			]
		})
			.select('-password')
			.sort({ createdAt: -1 });

		return res.status(200).json({
			message: 'Interns fetched successfully',
			interns,
		});
	} catch (error) {
		return res.status(500).json({ message: 'internal server error' });
	}
}



// Step 1: TL sees requests waiting for their review (scoped strictly to own interns)
export const getRequestsForReview = async (req, res) => {
  try {
    const leaderEmail = req.user.email ? req.user.email.toLowerCase() : '__no_email__';
    const myInterns = await User.find({
      role: 'intern',
      $or: [
        { 'internshipDetails.teamLeaderId': req.user.id },
        { 'internshipDetails.teamleaderEmail': leaderEmail }
      ]
    }).select('_id');
    const myInternIds = myInterns.map((i) => i._id);

    const requests = await CertificateRequest.find({
      status: 'pending',
      userId: { $in: myInternIds }
    })
      .populate('userId', 'fullName email internCode domain')
      .sort({ requestedAt: -1 });

    res.json({ requests });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};



// Step 2: TL either forwards (→ processing) or rejects (→ rejected, terminal)
export const reviewRequestAsTL = async (req, res) => {
  try {
    const { action, rejectionReason } = req.body; // action: 'forward' | 'reject'

    if (!['forward', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'action must be "forward" or "reject"' });
    }

    const request = await CertificateRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    // Task I Scoping: verify that this certificate request belongs to this TL's intern
    const intern = await User.findById(request.userId).select('internshipDetails');
    const leaderEmail = req.user.email ? req.user.email.toLowerCase() : '__no_email__';
    const isMyIntern = intern && (
      (intern.internshipDetails?.teamLeaderId && String(intern.internshipDetails.teamLeaderId) === String(req.user.id)) ||
      (intern.internshipDetails?.teamleaderEmail && intern.internshipDetails.teamleaderEmail.toLowerCase() === leaderEmail)
    );

    if (!isMyIntern) {
      return res.status(403).json({ message: "Access denied: Request does not belong to your intern" });
    }

    if (request.status !== 'pending') {
      return res.status(409).json({ message: 'This request has already been reviewed' });
    }

    if (action === 'reject') {
      if (!rejectionReason) {
        return res.status(400).json({ message: 'rejectionReason is required when rejecting' });
      }
      request.status = 'rejected';
      request.reviewedBy = req.user.id;
      request.reviewedAt = new Date();
      request.rejectionReason = rejectionReason;

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
        message: `Your certificate request has been rejected by Team Leader. Reason: ${rejectionReason}`,
        requestId: request._id,
        email: true
      });
    } else {
      request.status = 'processing';
      request.forwardedBy = req.user.id;   // remove this line if you skipped the schema addition
      request.forwardedAt = new Date();    // remove this line if you skipped the schema addition

      await logAction({
        req,
        actor: req.user,
        action: 'REQUEST_FORWARDED',
        targetType: 'certificate_request',
        targetId: request._id,
        meta: { internId: request.userId, certificateType: request.certificateType }
      });

      // Notify all admins (in-app)
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        notify(admin._id, 'REQUEST_FORWARDED', {
          title: 'Certificate Request Forwarded',
          message: `A certificate request (${request.requestNumber || request.certificateType}) was reviewed and forwarded by Team Leader.`,
          requestId: request._id,
          email: false
        });
      }
    }

    await request.save();
    clearAnalyticsCache();
    res.json({ request });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(30);

    return res.status(200).json({ notifications });
  } catch (error) {
    return res.status(500).json({ message: 'internal server error' });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    return res.status(200).json({ notification });
  } catch (error) {
    return res.status(500).json({ message: 'internal server error' });
  }
};
