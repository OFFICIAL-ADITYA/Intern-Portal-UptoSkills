import rateLimit from 'express-rate-limit';

// Standard 429 response builder
const createLimiterHandler = (message) => (req, res, _next, options) => {
  const retryAfter = Math.ceil((options.windowMs) / 1000);
  res.setHeader('Retry-After', String(retryAfter));
  return res.status(429).json({
    message: message || 'Too many requests. Please try again later.',
    retryAfterSeconds: retryAfter
  });
};

/**
 * Login rate limiter: 5 attempts per 15 minutes per IP and email
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false, xForwardedForHeader: false },
  keyGenerator: (req) => {
    const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return `${ip}_${email}`;
  },
  handler: createLimiterHandler('Too many login attempts. Please try again after 15 minutes.'),
  skip: () => process.env.NODE_ENV === 'test' && process.env.ENABLE_TEST_RATE_LIMIT !== 'true',
});

/**
 * Forgot password rate limiter: 3 per hour per IP and email
 */
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false, xForwardedForHeader: false },
  keyGenerator: (req) => {
    const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return `${ip}_${email}`;
  },
  handler: createLimiterHandler('Too many password reset requests. Please try again after 1 hour.'),
  skip: () => process.env.NODE_ENV === 'test' && process.env.ENABLE_TEST_RATE_LIMIT !== 'true',
});

/**
 * Reset password & set password rate limiter: 5 per 15 minutes
 */
export const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false, xForwardedForHeader: false },
  keyGenerator: (req) => req.ip || req.socket?.remoteAddress || '127.0.0.1',
  handler: createLimiterHandler('Too many attempts. Please try again after 15 minutes.'),
  skip: () => process.env.NODE_ENV === 'test' && process.env.ENABLE_TEST_RATE_LIMIT !== 'true',
});

/**
 * Public verify rate limiter: 30 requests per minute
 */
export const verifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false, xForwardedForHeader: false },
  keyGenerator: (req) => req.ip || req.socket?.remoteAddress || '127.0.0.1',
  handler: createLimiterHandler('Too many verification requests. Please try again after 1 minute.'),
  skip: () => process.env.NODE_ENV === 'test' && process.env.ENABLE_TEST_RATE_LIMIT !== 'true',
});
