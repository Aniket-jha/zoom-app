// routes/zoom.routes.js
const express = require('express');
const router = express.Router();

// Import middleware
const { verifyApiKey } = require('../middleware/auth.middleware');
const {
  validateZakTokenRequest,
  validateMeetingCreation,
  validateObfTokenGeneration,
  validateMeetingId,
  validateBatchObfTokens,
} = require('../middleware/validation.middleware');

// Import controllers
const {
  getZoomToken,
  generateZakToken,
  createMeeting,
  getMeetingDetails,
  updateMeeting,
  deleteMeeting,
  generateObfToken,
  generateBatchObfTokens,
  listZoomUsers,
} = require('../controllers/zoom.controller');

// All routes require API key authentication
router.use(verifyApiKey);

/**
 * @route   POST /api/zoom/token
 * @desc    Get Zoom server-to-server OAuth token (for debugging)
 * @access  Private
 */
router.post('/token', getZoomToken);

/**
 * @route   POST /api/zoom/zak-token
 * @desc    Generate ZAK token for a user
 * @access  Private
 */
router.post('/zak-token', validateZakTokenRequest, generateZakToken);

/**
 * @route   POST /api/zoom/meeting
 * @desc    Create a new Zoom meeting
 * @access  Private
 */
router.post('/meeting', validateMeetingCreation, createMeeting);

/**
 * @route   GET /api/zoom/meeting/:meetingId
 * @desc    Get meeting details
 * @access  Private
 */
router.get('/meeting/:meetingId', validateMeetingId, getMeetingDetails);

/**
 * @route   PATCH /api/zoom/meeting/:meetingId
 * @desc    Update a meeting
 * @access  Private
 */
router.patch('/meeting/:meetingId', validateMeetingId, updateMeeting);

/**
 * @route   DELETE /api/zoom/meeting/:meetingId
 * @desc    Delete a meeting
 * @access  Private
 */
router.delete('/meeting/:meetingId', validateMeetingId, deleteMeeting);

/**
 * @route   POST /api/zoom/obf-token
 * @desc    Generate OBF token for a single user to join a meeting
 * @access  Private
 */
router.post('/obf-token', validateObfTokenGeneration, generateObfToken);

/**
 * @route   POST /api/zoom/obf-tokens/batch
 * @desc    Generate OBF tokens for multiple users
 * @access  Private
 */
router.post('/obf-tokens/batch', validateBatchObfTokens, generateBatchObfTokens);

/**
 * @route   GET /api/zoom/users
 * @desc    List all users in Zoom account
 * @access  Private
 */
router.get('/users', listZoomUsers);

module.exports = router;
