import { body, param, query, validationResult } from 'express-validator';

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array()[0]?.msg || 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

export const createInternValidator = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('mobileNo').optional().trim(),
  body('domain').optional().trim(),
  body('startDate').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Start date must be a valid date'),
  body('endDate').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('End date must be a valid date'),
  body('teamleaderEmail').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Team leader email must be a valid email').normalizeEmail(),
  handleValidationErrors,
];

export const createTLValidator = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  handleValidationErrors,
];

export const submitRequestValidator = [
  body('certificateType')
    .trim()
    .notEmpty()
    .withMessage('Certificate type is required')
    .isIn([
      'offer_letter',
      'bonafide',
      'ojt_certificate',
      'experience_letter',
      'experience_letter_detailed',
      'completion_certificate',
      'intern_of_month',
      'league_winner',
      'custom',
    ])
    .withMessage('Invalid certificate type'),
  body('reason').optional().trim(),
  handleValidationErrors,
];

export const reviewTLValidator = [
  body('action').trim().isIn(['forward', 'reject']).withMessage('Action must be "forward" or "reject"'),
  body('rejectionReason')
    .if(body('action').equals('reject'))
    .trim()
    .notEmpty()
    .withMessage('rejectionReason is required when rejecting'),
  handleValidationErrors,
];

export const templateValidator = [
  body('templateName').trim().notEmpty().withMessage('Template name is required'),
  body('certificateType').trim().notEmpty().withMessage('Certificate type is required'),
  body('htmlContent').trim().notEmpty().withMessage('HTML content is required'),
  handleValidationErrors,
];

export const analyticsQueryValidator = [
  query('from').optional({ checkFalsy: true }).isISO8601().withMessage('From date must be a valid date (YYYY-MM-DD)'),
  query('to').optional({ checkFalsy: true }).isISO8601().withMessage('To date must be a valid date (YYYY-MM-DD)'),
  query('groupBy').optional().isIn(['month', 'week', 'day']).withMessage('groupBy must be month, week, or day'),
  handleValidationErrors,
];
