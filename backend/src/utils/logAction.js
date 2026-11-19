import AuditLog from '../models/AuditLog.model.js';

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'interncode',
  'resetpasswordtoken'
]);

/**
 * Recursively strips sensitive fields from meta
 * Strip password, token, internCode, resetPasswordToken and any key containing "secret"
 */
export const sanitizeMeta = (data) => {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeMeta(item));
  }

  // Handle Mongoose documents or plain objects
  const obj = typeof data.toObject === 'function' ? data.toObject() : data;
  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('secret')) {
      continue;
    }
    sanitized[key] = sanitizeMeta(value);
  }

  return sanitized;
};

/**
 * Log an action to the audit log.
 * Guaranteed to never throw or block the main request.
 *
 * @param {Object} params
 * @param {Object} [params.req] - Express request object
 * @param {Object|string} [params.actor] - User object, or 'system'
 * @param {string} params.action - Agreed action name (e.g. 'LOGIN', 'USER_CREATED', etc.)
 * @param {string} [params.targetType] - Type of target entity (e.g. 'user', 'certificate', etc.)
 * @param {string|mongoose.Types.ObjectId} [params.targetId] - ID of target entity
 * @param {Object} [params.meta] - Additional metadata
 * @returns {Promise<AuditLog|null>}
 */
export const logAction = async ({ req, actor, action, targetType, targetId, meta = {} } = {}) => {
  try {
    if (!action) {
      console.warn('[logAction] Warning: action is required');
      return null;
    }

    // In unit test environments without a DB connection, skip DB write to avoid buffering timeout
    if (AuditLog.db?.readyState !== 1) {
      return null;
    }

    let actorId = null;
    let actorRole = 'system';

    if (actor) {
      if (typeof actor === 'string' && actor === 'system') {
        actorId = null;
        actorRole = 'system';
      } else if (typeof actor === 'object') {
        actorId = actor._id || actor.id || null;
        actorRole = actor.role || 'system';
      }
    } else if (req?.user) {
      actorId = req.user._id || req.user.id || null;
      actorRole = req.user.role || 'system';
    }

    const ip = req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '';
    const userAgent =
      (req?.headers && req.headers['user-agent']) ||
      (typeof req?.get === 'function' ? req.get('user-agent') : '') ||
      '';

    const cleanedMeta = sanitizeMeta(meta);

    const logEntry = await AuditLog.create({
      actorId,
      actorRole,
      action,
      targetType: targetType || null,
      targetId: targetId || null,
      meta: cleanedMeta,
      ip,
      userAgent,
      createdAt: new Date()
    });

    return logEntry;
  } catch (error) {
    console.error('[logAction] Failed to record audit log:', error.message);
    return null;
  }
};

export default logAction;
