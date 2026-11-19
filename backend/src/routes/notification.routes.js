import { Router } from 'express';
import mongoose from 'mongoose';
import verifyAuth from '../middlewares/verifyAuth.js';
import Notification from '../models/Notification.model.js';

const notificationRouter = Router();

// All routes require authentication, scoped to req.user.id
notificationRouter.use(verifyAuth);

/**
 * GET /api/notifications
 * Query params: unread (boolean), page (number), limit (number)
 */
notificationRouter.get('/', async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = { userId };
    if (req.query.unread === 'true') {
      filter.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId, isRead: false })
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return res.status(200).json({
      notifications,
      page,
      totalPages,
      total,
      unreadCount
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
});

/**
 * GET /api/notifications/unread-count
 * Returns the unread notification count for the logged-in user
 */
notificationRouter.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const count = await Notification.countDocuments({ userId, isRead: false });
    return res.status(200).json({ count });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch unread count',
      error: error.message
    });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read.
 * Returns 404 if notification not found or belongs to another user.
 */
notificationRouter.patch('/:id/read', async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const notification = await Notification.findOne({ _id: id, userId });
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    return res.status(200).json({
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
});

/**
 * PATCH /api/notifications/read-all
 * Marks all notifications for the current user as read.
 */
notificationRouter.patch('/read-all', async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const result = await Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return res.status(200).json({
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
});

export default notificationRouter;
