// middleware/validation.middleware.js
const { body, param, validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  
  next();
};

/**
 * Validation rules for ZAK token generation
 */
const validateZakTokenRequest = [
  body('userEmail')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  handleValidationErrors,
];

/**
 * Validation rules for meeting creation
 */
const validateMeetingCreation = [
  body('userEmail')
    .isEmail()
    .withMessage('Valid user email is required')
    .normalizeEmail(),
  body('topic')
    .notEmpty()
    .withMessage('Meeting topic is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Topic must be between 1 and 200 characters'),
  body('startTime')
    .notEmpty()
    .withMessage('Start time is required')
    .isISO8601()
    .withMessage('Start time must be in ISO 8601 format'),
  body('duration')
    .notEmpty()
    .withMessage('Duration is required')
    .isInt({ min: 1, max: 1440 })
    .withMessage('Duration must be between 1 and 1440 minutes'),
  body('timezone')
    .optional()
    .isString()
    .withMessage('Timezone must be a string'),
  body('agenda')
    .optional()
    .isString()
    .isLength({ max: 2000 })
    .withMessage('Agenda must be less than 2000 characters'),
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object'),
  handleValidationErrors,
];

/**
 * Validation rules for OBF token generation
 */
const validateObfTokenGeneration = [
  body('meetingId')
    .notEmpty()
    .withMessage('Meeting ID is required')
    .isString()
    .withMessage('Meeting ID must be a string'),
  body('userName')
    .notEmpty()
    .withMessage('User name is required')
    .isString()
    .withMessage('User name must be a string'),
  body('userEmail')
    .isEmail()
    .withMessage('Valid user email is required')
    .normalizeEmail(),
  handleValidationErrors,
];

/**
 * Validation rules for meeting ID parameter
 */
const validateMeetingId = [
  param('meetingId')
    .notEmpty()
    .withMessage('Meeting ID is required'),
  handleValidationErrors,
];

/**
 * Validation rules for batch OBF token generation
 */
const validateBatchObfTokens = [
  body('meetingId')
    .notEmpty()
    .withMessage('Meeting ID is required'),
  body('users')
    .isArray({ min: 1 })
    .withMessage('Users array is required with at least one user'),
  body('users.*.userName')
    .notEmpty()
    .withMessage('User name is required for each user'),
  body('users.*.userEmail')
    .isEmail()
    .withMessage('Valid email is required for each user'),
  handleValidationErrors,
];

module.exports = {
  validateZakTokenRequest,
  validateMeetingCreation,
  validateObfTokenGeneration,
  validateMeetingId,
  validateBatchObfTokens,
  handleValidationErrors,
};
