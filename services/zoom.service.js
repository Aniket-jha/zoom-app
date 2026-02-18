// services/zoom.service.js
const axios = require('axios');

class ZoomService {
  constructor() {
    this.baseURL = 'https://api.zoom.us/v2';
    this.oauthURL = 'https://zoom.us/oauth/token';
    this.accountId = process.env.ZOOM_ACCOUNT_ID;
    this.clientId = process.env.ZOOM_CLIENT_ID;
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET;
    
    // Cache for access token
    this.accessTokenCache = null;
    this.tokenExpiry = null;
  }

  /**
   * Get Server-to-Server OAuth Access Token
   * Cached to avoid unnecessary API calls
   */
  async getAccessToken() {
    try {
      // Return cached token if still valid
      if (this.accessTokenCache && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.accessTokenCache;
      }

      const authString = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post(
        this.oauthURL,
        null,
        {
          params: {
            grant_type: 'account_credentials',
            account_id: this.accountId,
          },
          headers: {
            'Authorization': `Basic ${authString}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      // Cache token (expires in 1 hour, we'll refresh 5 minutes early)
      this.accessTokenCache = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;

      return this.accessTokenCache;
    } catch (error) {
      console.error('Error getting Zoom access token:', error.response?.data || error.message);
      throw new Error(`Failed to get Zoom access token: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get ZAK (Zoom Access Key) token for a specific user
   * This allows the user to start/host meetings
   * 
   * @param {string} userEmail - Email of the Zoom account
   */
  async getZakToken(userEmail) {
    try {
      const accessToken = await this.getAccessToken();
      
      // Get user ID from email
      const userResponse = await axios.get(
        `${this.baseURL}/users/${encodeURIComponent(userEmail)}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const userId = userResponse.data.id;

      // Get ZAK token for the user
      const zakResponse = await axios.get(
        `${this.baseURL}/users/${userId}/token`,
        {
          params: {
            type: 'zak',
          },
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        zakToken: zakResponse.data.token,
        userId: userId,
        userEmail: userEmail,
        expiresIn: 7200, // 2 hours in seconds
        expiresAt: new Date(Date.now() + 7200000).toISOString(),
      };
    } catch (error) {
      console.error('Error getting ZAK token:', error.response?.data || error.message);
      
      if (error.response?.status === 404) {
        throw new Error(`User with email ${userEmail} not found in Zoom account`);
      }
      
      throw new Error(`Failed to get ZAK token: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create a Zoom meeting
   * 
   * @param {string} userEmail - Email of the host's Zoom account
   * @param {object} meetingData - Meeting configuration
   */
  async createMeeting(userEmail, meetingData) {
    try {
      const accessToken = await this.getAccessToken();

      const payload = {
        topic: meetingData.topic,
        type: 2, // Scheduled meeting
        start_time: meetingData.startTime,
        duration: meetingData.duration,
        timezone: meetingData.timezone || 'UTC',
        agenda: meetingData.agenda || '',
        settings: {
          host_video: meetingData.settings?.host_video ?? true,
          participant_video: meetingData.settings?.participant_video ?? true,
          join_before_host: meetingData.settings?.join_before_host ?? false,
          mute_upon_entry: meetingData.settings?.mute_upon_entry ?? true,
          watermark: meetingData.settings?.watermark ?? false,
          use_pmi: false,
          approval_type: meetingData.settings?.approval_type ?? 2,
          audio: meetingData.settings?.audio || 'both',
          auto_recording: meetingData.settings?.auto_recording || 'none',
          waiting_room: meetingData.settings?.waiting_room ?? false,
          ...meetingData.settings,
        },
      };

      const response = await axios.post(
        `${this.baseURL}/users/${encodeURIComponent(userEmail)}/meetings`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        meetingId: response.data.id.toString(),
        meetingNumber: response.data.id,
        topic: response.data.topic,
        startTime: response.data.start_time,
        duration: response.data.duration,
        timezone: response.data.timezone,
        joinUrl: response.data.join_url,
        password: response.data.password,
        hostEmail: response.data.host_email,
        agenda: response.data.agenda,
        settings: response.data.settings,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error creating meeting:', error.response?.data || error.message);
      throw new Error(`Failed to create meeting: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get meeting details
   * 
   * @param {string} meetingId - Zoom meeting ID
   */
  async getMeeting(meetingId) {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.get(
        `${this.baseURL}/meetings/${meetingId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        meetingId: response.data.id.toString(),
        meetingNumber: response.data.id,
        topic: response.data.topic,
        startTime: response.data.start_time,
        duration: response.data.duration,
        timezone: response.data.timezone,
        joinUrl: response.data.join_url,
        password: response.data.password,
        hostEmail: response.data.host_email,
        agenda: response.data.agenda,
        status: response.data.status,
        settings: response.data.settings,
      };
    } catch (error) {
      console.error('Error getting meeting:', error.response?.data || error.message);
      throw new Error(`Failed to get meeting: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Generate SDK JWT token for joining a meeting
   * This is what users need to join without a Zoom account
   * 
   * @param {number} meetingNumber - Zoom meeting number
   * @param {number} role - 0 = participant, 1 = host
   */
  async generateSdkJWT(meetingNumber, role = 0) {
    try {
      const jwt = require('jsonwebtoken');
      
      const payload = {
        appKey: this.clientId,
        sdkKey: this.clientId,
        mn: meetingNumber,
        role: role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7200, // 2 hours
        tokenExp: Math.floor(Date.now() / 1000) + 7200,
      };

      const token = jwt.sign(payload, this.clientSecret);
      
      return {
        token: token,
        expiresIn: 7200,
        expiresAt: new Date(Date.now() + 7200000).toISOString(),
      };
    } catch (error) {
      console.error('Error generating SDK JWT:', error.message);
      throw new Error(`Failed to generate SDK JWT: ${error.message}`);
    }
  }

  /**
   * Update a meeting
   * 
   * @param {string} meetingId - Zoom meeting ID
   * @param {object} updateData - Updated meeting data
   */
  async updateMeeting(meetingId, updateData) {
    try {
      const accessToken = await this.getAccessToken();

      await axios.patch(
        `${this.baseURL}/meetings/${meetingId}`,
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return { 
        success: true,
        meetingId: meetingId,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error updating meeting:', error.response?.data || error.message);
      throw new Error(`Failed to update meeting: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Delete a meeting
   * 
   * @param {string} meetingId - Zoom meeting ID
   */
  async deleteMeeting(meetingId) {
    try {
      const accessToken = await this.getAccessToken();

      await axios.delete(
        `${this.baseURL}/meetings/${meetingId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return { 
        success: true,
        meetingId: meetingId,
        deletedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error deleting meeting:', error.response?.data || error.message);
      throw new Error(`Failed to delete meeting: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get list of users in the Zoom account
   */
  async listUsers() {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.get(
        `${this.baseURL}/users`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.users;
    } catch (error) {
      console.error('Error listing users:', error.response?.data || error.message);
      throw new Error(`Failed to list users: ${error.response?.data?.message || error.message}`);
    }
  }
}

module.exports = new ZoomService();
