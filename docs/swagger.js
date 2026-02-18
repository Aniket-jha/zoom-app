const swaggerJsdoc = require('swagger-jsdoc');

const definition = {
  openapi: '3.0.3',
  info: {
    title: 'Zoom API Wrapper',
    version: '2.0.0',
    description:
      'Standalone Zoom API wrapper for Flutter apps using Firebase Client SDK. All endpoints require X-API-Key unless stated otherwise.',
  },
  servers: [
    {
      url: 'http://localhost:3000/api',
      description: 'Local development',
    },
  ],
  tags: [
    { name: 'Health', description: 'Service health' },
    { name: 'Zoom', description: 'Zoom operations' },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'Validation error' },
          details: { type: 'string', example: 'userEmail is required' },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          timestamp: { type: 'string', format: 'date-time' },
          service: { type: 'string', example: 'Zoom API Wrapper' },
          version: { type: 'string', example: '2.0.0' },
        },
      },
      TokenResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              access_token: { type: 'string' },
              token_type: { type: 'string', example: 'bearer' },
              message: { type: 'string', example: 'Token retrieved successfully' },
            },
          },
        },
      },
      ZakTokenRequest: {
        type: 'object',
        required: ['userEmail'],
        properties: {
          userEmail: { type: 'string', example: 'admin@example.com' },
        },
      },
      ZakTokenResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              zakToken: { type: 'string' },
              userId: { type: 'string' },
              userEmail: { type: 'string' },
              expiresIn: { type: 'integer', example: 7200 },
              expiresAt: { type: 'string', format: 'date-time' },
            },
          },
          message: { type: 'string' },
        },
      },
      CreateMeetingRequest: {
        type: 'object',
        required: ['userEmail', 'topic', 'startTime', 'duration'],
        properties: {
          userEmail: { type: 'string', example: 'admin@example.com' },
          topic: { type: 'string', example: 'Team Weekly Standup' },
          startTime: { type: 'string', format: 'date-time' },
          duration: { type: 'integer', example: 60 },
          timezone: { type: 'string', example: 'Asia/Kolkata' },
          agenda: { type: 'string', example: 'Discuss weekly progress' },
          settings: {
            type: 'object',
            properties: {
              host_video: { type: 'boolean', example: true },
              participant_video: { type: 'boolean', example: true },
              join_before_host: { type: 'boolean', example: false },
              mute_upon_entry: { type: 'boolean', example: true },
              waiting_room: { type: 'boolean', example: false },
              audio: { type: 'string', example: 'both' },
              auto_recording: { type: 'string', example: 'none' },
            },
          },
        },
      },
      MeetingResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              meetingId: { type: 'string' },
              meetingNumber: { type: 'integer' },
              topic: { type: 'string' },
              startTime: { type: 'string', format: 'date-time' },
              duration: { type: 'integer' },
              timezone: { type: 'string' },
              joinUrl: { type: 'string' },
              password: { type: 'string' },
              hostEmail: { type: 'string' },
              agenda: { type: 'string' },
              settings: { type: 'object' },
              createdAt: { type: 'string', format: 'date-time' },
              status: { type: 'string' },
            },
          },
          message: { type: 'string' },
        },
      },
      UpdateMeetingRequest: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          start_time: { type: 'string', format: 'date-time' },
          duration: { type: 'integer' },
        },
      },
      UpdateMeetingResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              meetingId: { type: 'string' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          message: { type: 'string' },
        },
      },
      DeleteMeetingResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              meetingId: { type: 'string' },
              deletedAt: { type: 'string', format: 'date-time' },
            },
          },
          message: { type: 'string' },
        },
      },
      ObfTokenRequest: {
        type: 'object',
        required: ['meetingId', 'userName', 'userEmail'],
        properties: {
          meetingId: { type: 'string', example: '87654321098' },
          userName: { type: 'string', example: 'John Doe' },
          userEmail: { type: 'string', example: 'john@example.com' },
        },
      },
      ObfTokenResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              meetingId: { type: 'string' },
              userName: { type: 'string' },
              userEmail: { type: 'string' },
              expiresIn: { type: 'integer', example: 7200 },
              expiresAt: { type: 'string', format: 'date-time' },
            },
          },
          message: { type: 'string' },
        },
      },
      BatchObfTokensRequest: {
        type: 'object',
        required: ['meetingId', 'users'],
        properties: {
          meetingId: { type: 'string', example: '87654321098' },
          users: {
            type: 'array',
            items: {
              type: 'object',
              required: ['userName', 'userEmail'],
              properties: {
                userName: { type: 'string', example: 'John Doe' },
                userEmail: { type: 'string', example: 'john@example.com' },
              },
            },
          },
        },
      },
      BatchObfTokensResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              meetingId: { type: 'string' },
              totalUsers: { type: 'integer' },
              successCount: { type: 'integer' },
              errorCount: { type: 'integer' },
              tokens: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    userName: { type: 'string' },
                    userEmail: { type: 'string' },
                    token: { type: 'string' },
                    expiresIn: { type: 'integer' },
                    expiresAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          message: { type: 'string' },
        },
      },
      UsersResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              totalUsers: { type: 'integer' },
              users: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    first_name: { type: 'string' },
                    last_name: { type: 'string' },
                    type: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        security: [],
        responses: {
          200: {
            description: 'Service healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/zoom/token': {
      post: {
        tags: ['Zoom'],
        summary: 'Get Zoom server-to-server OAuth token (debug)',
        security: [{ ApiKeyAuth: [] }],
        responses: {
          200: {
            description: 'Token retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TokenResponse' },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/zoom/zak-token': {
      post: {
        tags: ['Zoom'],
        summary: 'Generate ZAK token',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ZakTokenRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'ZAK token generated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ZakTokenResponse' },
              },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/zoom/meeting': {
      post: {
        tags: ['Zoom'],
        summary: 'Create a Zoom meeting',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateMeetingRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Meeting created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MeetingResponse' },
              },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/zoom/meeting/{meetingId}': {
      get: {
        tags: ['Zoom'],
        summary: 'Get meeting details',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'meetingId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Meeting details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MeetingResponse' },
              },
            },
          },
          404: {
            description: 'Not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Zoom'],
        summary: 'Update a meeting',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'meetingId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateMeetingRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Meeting updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateMeetingResponse' },
              },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Zoom'],
        summary: 'Delete a meeting',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'meetingId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Meeting deleted',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DeleteMeetingResponse' },
              },
            },
          },
          404: {
            description: 'Not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/zoom/obf-token': {
      post: {
        tags: ['Zoom'],
        summary: 'Generate OBF token (single user)',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ObfTokenRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'OBF token generated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ObfTokenResponse' },
              },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/zoom/obf-tokens/batch': {
      post: {
        tags: ['Zoom'],
        summary: 'Generate OBF tokens (batch)',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BatchObfTokensRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Batch OBF tokens generated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BatchObfTokensResponse' },
              },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/zoom/users': {
      get: {
        tags: ['Zoom'],
        summary: 'List Zoom users',
        security: [{ ApiKeyAuth: [] }],
        responses: {
          200: {
            description: 'Users list',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UsersResponse' },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
  },
};

const swaggerSpec = swaggerJsdoc({ definition, apis: [] });

module.exports = swaggerSpec;
