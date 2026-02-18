// controllers/zoom.controller.js
const zoomService = require('../services/zoom.service');

/**
 * @desc    Get Zoom server-to-server OAuth access token (for debugging)
 * @route   POST /api/zoom/token
 * @access  Private
 */
const getZoomToken = async (req, res) => {
  try {
    const accessToken = await zoomService.getAccessToken();

    res.json({
      success: true,
      data: {
        access_token: accessToken,
        token_type: 'bearer',
        message: 'Token retrieved successfully',
      },
    });
  } catch (error) {
    console.error('Error in getZoomToken:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Zoom access token',
      details: error.message,
    });
  }
};

/**
 * @desc    Generate ZAK token for a user
 * @route   POST /api/zoom/zak-token
 * @access  Private
 * 
 * Request Body:
 * {
 *   "userEmail": "admin@example.com"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "zakToken": "eyJhbGc...",
 *     "userId": "abc123",
 *     "userEmail": "admin@example.com",
 *     "expiresIn": 7200,
 *     "expiresAt": "2026-02-15T12:30:00.000Z"
 *   }
 * }
 * 
 * Usage: Flutter stores this in Firestore under the admin's document
 */
const generateZakToken = async (req, res) => {
  try {
    const { userEmail } = req.body;

    const zakData = await zoomService.getZakToken(userEmail);

    res.json({
      success: true,
      data: zakData,
      message: 'ZAK token generated successfully. Store this in your database.',
    });
  } catch (error) {
    console.error('Error in generateZakToken:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate ZAK token',
      details: error.message,
    });
  }
};

/**
 * @desc    Create a Zoom meeting
 * @route   POST /api/zoom/meeting
 * @access  Private
 * 
 * Request Body:
 * {
 *   "userEmail": "admin@example.com",
 *   "topic": "Team Meeting",
 *   "startTime": "2026-02-20T10:00:00Z",
 *   "duration": 60,
 *   "timezone": "Asia/Kolkata",
 *   "agenda": "Weekly sync",
 *   "settings": {
 *     "host_video": true,
 *     "participant_video": true
 *   }
 * }
 * 
 * Response: Full meeting details to store in Firestore
 */
const createMeeting = async (req, res) => {
  try {
    const {
      userEmail,
      topic,
      startTime,
      duration,
      timezone,
      agenda,
      settings,
    } = req.body;

    const meetingData = {
      topic,
      startTime,
      duration,
      timezone: timezone || 'UTC',
      agenda: agenda || '',
      settings: settings || {},
    };

    const meeting = await zoomService.createMeeting(userEmail, meetingData);

    res.status(201).json({
      success: true,
      data: meeting,
      message: 'Meeting created successfully. Store this data in your Firestore.',
    });
  } catch (error) {
    console.error('Error in createMeeting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create meeting',
      details: error.message,
    });
  }
};

/**
 * @desc    Get meeting details
 * @route   GET /api/zoom/meeting/:meetingId
 * @access  Private
 */
const getMeetingDetails = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await zoomService.getMeeting(meetingId);

    res.json({
      success: true,
      data: meeting,
    });
  } catch (error) {
    console.error('Error in getMeetingDetails:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get meeting details',
      details: error.message,
    });
  }
};

/**
 * @desc    Update a meeting
 * @route   PATCH /api/zoom/meeting/:meetingId
 * @access  Private
 * 
 * Request Body: Any meeting fields to update
 * {
 *   "topic": "Updated Topic",
 *   "start_time": "2026-02-21T10:00:00Z"
 * }
 */
const updateMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const updateData = req.body;

    const result = await zoomService.updateMeeting(meetingId, updateData);

    res.json({
      success: true,
      data: result,
      message: 'Meeting updated successfully. Update your Firestore record.',
    });
  } catch (error) {
    console.error('Error in updateMeeting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update meeting',
      details: error.message,
    });
  }
};

/**
 * @desc    Delete a meeting
 * @route   DELETE /api/zoom/meeting/:meetingId
 * @access  Private
 */
const deleteMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const result = await zoomService.deleteMeeting(meetingId);

    res.json({
      success: true,
      data: result,
      message: 'Meeting deleted from Zoom. Delete from your Firestore as well.',
    });
  } catch (error) {
    console.error('Error in deleteMeeting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete meeting',
      details: error.message,
    });
  }
};

/**
 * @desc    Generate OBF token for a single user to join a meeting
 * @route   POST /api/zoom/obf-token
 * @access  Private
 * 
 * Request Body:
 * {
 *   "meetingId": "87654321098",
 *   "userName": "John Doe",
 *   "userEmail": "john@example.com"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "token": "eyJhbGc...",
 *     "meetingId": "87654321098",
 *     "userName": "John Doe",
 *     "userEmail": "john@example.com",
 *     "expiresIn": 7200,
 *     "expiresAt": "2026-02-15T12:30:00.000Z"
 *   }
 * }
 * 
 * Usage: Flutter stores this token in Firestore under meeting participants
 */
const generateObfToken = async (req, res) => {
  try {
    const { meetingId, userName, userEmail } = req.body;

    // Generate SDK JWT token for the user
    const tokenData = await zoomService.generateSdkJWT(parseInt(meetingId), 0);

    res.json({
      success: true,
      data: {
        token: tokenData.token,
        meetingId: meetingId,
        userName: userName,
        userEmail: userEmail,
        expiresIn: tokenData.expiresIn,
        expiresAt: tokenData.expiresAt,
      },
      message: 'OBF token generated. Store this in Firestore under meeting participants.',
    });
  } catch (error) {
    console.error('Error in generateObfToken:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate OBF token',
      details: error.message,
    });
  }
};

/**
 * @desc    Generate OBF tokens for multiple users
 * @route   POST /api/zoom/obf-tokens/batch
 * @access  Private
 * 
 * Request Body:
 * {
 *   "meetingId": "87654321098",
 *   "users": [
 *     { "userName": "John Doe", "userEmail": "john@example.com" },
 *     { "userName": "Jane Smith", "userEmail": "jane@example.com" }
 *   ]
 * }
 * 
 * Response: Array of tokens for each user
 * 
 * Usage: Flutter loops through and stores each token in Firestore
 */
const generateBatchObfTokens = async (req, res) => {
  try {
    const { meetingId, users } = req.body;

    const tokens = [];
    const errors = [];

    for (const user of users) {
      try {
        const tokenData = await zoomService.generateSdkJWT(parseInt(meetingId), 0);
        
        tokens.push({
          userName: user.userName,
          userEmail: user.userEmail,
          token: tokenData.token,
          expiresIn: tokenData.expiresIn,
          expiresAt: tokenData.expiresAt,
        });
      } catch (error) {
        console.error(`Error generating token for ${user.userEmail}:`, error);
        errors.push({
          userName: user.userName,
          userEmail: user.userEmail,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      data: {
        meetingId: meetingId,
        totalUsers: users.length,
        successCount: tokens.length,
        errorCount: errors.length,
        tokens: tokens,
        errors: errors.length > 0 ? errors : undefined,
      },
      message: 'Batch tokens generated. Store each in Firestore.',
    });
  } catch (error) {
    console.error('Error in generateBatchObfTokens:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate batch OBF tokens',
      details: error.message,
    });
  }
};

/**
 * @desc    List all users in Zoom account
 * @route   GET /api/zoom/users
 * @access  Private
 */
const listZoomUsers = async (req, res) => {
  try {
    const users = await zoomService.listUsers();

    res.json({
      success: true,
      data: {
        totalUsers: users.length,
        users: users,
      },
    });
  } catch (error) {
    console.error('Error in listZoomUsers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list Zoom users',
      details: error.message,
    });
  }
};

module.exports = {
  getZoomToken,
  generateZakToken,
  createMeeting,
  getMeetingDetails,
  updateMeeting,
  deleteMeeting,
  generateObfToken,
  generateBatchObfTokens,
  listZoomUsers,
};
