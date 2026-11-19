import Notification from '../models/Notification.model.js';
import User from '../models/User.js';
import { sendEmail } from '../utils/sendEmail.js';

/**
 * Creates an in-app notification and optionally sends an email notification.
 * Guaranteed to never throw if email sending fails.
 *
 * @param {string|mongoose.Types.ObjectId} userId - Recipient user ID
 * @param {string} type - Notification type (e.g. 'REQUEST_SUBMITTED', 'REQUEST_FORWARDED', etc.)
 * @param {Object} options
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message body
 * @param {string|mongoose.Types.ObjectId} [options.requestId] - Associated certificate request ID
 * @param {boolean} [options.email] - Whether to send an email notification
 * @returns {Promise<Notification>}
 */
export const notify = async (userId, type, { title, message, requestId = null, email = false } = {}) => {
  try {
    if (!userId) {
      console.warn('[notification.service] Warning: userId is required for notification');
      return null;
    }

    // Skip in offline unit test environments where db is not connected
    if (Notification.db?.readyState !== 1) {
      return null;
    }

    // 1. Create in-app notification
    const notification = await Notification.create({
      userId,
      type,
      title: title || 'Notification',
      message: message || '',
      requestId: requestId || null,
      isRead: false
    });

    // 2. If email requested, attempt sending email
    if (email) {
      try {
        const recipient = await User.findById(userId);
        if (recipient && recipient.email) {
          const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; max-width: 600px; margin: 0 auto; line-height: 1.6; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #0f172a; padding: 20px 24px; color: #ffffff;">
                <h2 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">UPTOSKILL PORTAL</h2>
              </div>
              <div style="padding: 24px;">
                <h3 style="color: #0369a1; margin-top: 0; margin-bottom: 12px; font-size: 18px;">${title}</h3>
                <p style="margin-bottom: 16px;">Hello <strong>${recipient.fullName || 'User'}</strong>,</p>
                <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 14px 16px; margin: 16px 0; border-radius: 0 4px 4px 0;">
                  <p style="margin: 0; color: #334155; font-size: 15px;">${message}</p>
                </div>
                <p style="margin-top: 24px; font-size: 13px; color: #64748b;">
                  You received this notification regarding your UPTOSKILL account or certificate request.
                </p>
              </div>
              <div style="background-color: #f1f5f9; padding: 12px 24px; font-size: 12px; color: #64748b; text-align: center;">
                &copy; ${new Date().getFullYear()} UPTOSKILL. All rights reserved.
              </div>
            </div>
          `;

          await sendEmail({
            to: recipient.email,
            subject: title,
            html
          });
        }
      } catch (emailError) {
        console.error(`[notification.service] Failed to send email to user ${userId}:`, emailError.message);
      }
    }

    return notification;
  } catch (error) {
    console.error('[notification.service] Failed to create notification:', error.message);
    return null;
  }
};

export default { notify };
