# Zoom API Wrapper - Complete Documentation

## Overview

This is a **standalone Zoom API wrapper** designed to work with Flutter apps that use **Firebase Client SDK**. Your Flutter app handles all Firebase operations directly, while this API only handles Zoom-specific operations.

## Architecture

```
┌─────────────────────────────────────┐
│         Flutter App                 │
├─────────────────────────────────────┤
│  Firebase Client SDK                │
│  ├─ Firebase Auth (login/signup)    │
│  ├─ Firestore (read/write data)     │
│  └─ Direct database access          │
├─────────────────────────────────────┤
│  HTTP Requests to Your API          │
│  ├─ Generate ZAK tokens             │
│  ├─ Create meetings                 │
│  ├─ Generate OBF tokens             │
│  └─ Get meeting details             │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│      Your Zoom API Wrapper          │
├─────────────────────────────────────┤
│  NO Firebase Admin SDK              │
│  Only Zoom API operations           │
│  Simple API key authentication      │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│         Zoom API                    │
└─────────────────────────────────────┘
```

## Key Differences from Previous Version

| Feature | Old Version | New Version |
|---------|-------------|-------------|
| **Firebase Admin SDK** | ✓ Required | ✗ Not used |
| **Firebase Auth** | Server-side | Client-side (Flutter) |
| **Data Storage** | Server handles | Client handles (Flutter) |
| **Authentication** | Firebase ID tokens | Simple API key |
| **User Management** | Server-side | Client-side (Flutter) |
| **Complexity** | High | Low |

---

## Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Server
PORT=3000
NODE_ENV=development

# API Key (generate with: openssl rand -hex 32)
API_KEY=your-generated-api-key

# Zoom Credentials
ZOOM_ACCOUNT_ID=your-zoom-account-id
ZOOM_CLIENT_ID=your-zoom-client-id
ZOOM_CLIENT_SECRET=your-zoom-client-secret
```

### 3. Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

---

## API Endpoints

### Base URL
```
http://localhost:3000/api
```

### Authentication
All endpoints require an API key in the header:

```
X-API-Key: your-api-key-here
```

---

## Complete API Reference

### 1. Health Check

**Endpoint:** `GET /api/health`

**Authentication:** Not required

**Description:** Check if the API is running

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-15T10:30:00.000Z",
  "service": "Zoom API Wrapper",
  "version": "2.0.0"
}
```

---

### 2. Get Zoom Access Token (Debug)

**Endpoint:** `POST /api/zoom/token`

**Authentication:** Required

**Description:** Get the server-to-server OAuth token (mainly for debugging)

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "message": "Token retrieved successfully"
  }
}
```

---

### 3. Generate ZAK Token

**Endpoint:** `POST /api/zoom/zak-token`

**Authentication:** Required

**Description:** Generate a ZAK token for an admin to host/create meetings

**Request Body:**
```json
{
  "userEmail": "admin@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "zakToken": "eyJhbGciOiJIUzUxMiIsInYiOiIyLjAiLCJraWQiOiI8S0lEPiJ9...",
    "userId": "abc123xyz",
    "userEmail": "admin@example.com",
    "expiresIn": 7200,
    "expiresAt": "2026-02-15T12:30:00.000Z"
  },
  "message": "ZAK token generated successfully. Store this in your database."
}
```

**Flutter Usage:**
```dart
// 1. Call API
final response = await http.post(
  Uri.parse('$apiUrl/zoom/zak-token'),
  headers: {'X-API-Key': apiKey},
  body: json.encode({'userEmail': 'admin@example.com'}),
);

// 2. Store in Firestore
final zakData = json.decode(response.body)['data'];
await FirebaseFirestore.instance
  .collection('admins')
  .doc(adminId)
  .update({
    'zakToken': zakData['zakToken'],
    'zakTokenExpiresAt': zakData['expiresAt'],
  });
```

---

### 4. Create Meeting

**Endpoint:** `POST /api/zoom/meeting`

**Authentication:** Required

**Description:** Create a new Zoom meeting

**Request Body:**
```json
{
  "userEmail": "admin@example.com",
  "topic": "Team Weekly Standup",
  "startTime": "2026-02-20T10:00:00Z",
  "duration": 60,
  "timezone": "Asia/Kolkata",
  "agenda": "Discuss weekly progress",
  "settings": {
    "host_video": true,
    "participant_video": true,
    "join_before_host": false,
    "mute_upon_entry": true,
    "waiting_room": false,
    "audio": "both",
    "auto_recording": "none"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "meetingId": "87654321098",
    "meetingNumber": 87654321098,
    "topic": "Team Weekly Standup",
    "startTime": "2026-02-20T10:00:00Z",
    "duration": 60,
    "timezone": "Asia/Kolkata",
    "joinUrl": "https://zoom.us/j/87654321098",
    "password": "xyz123",
    "hostEmail": "admin@example.com",
    "agenda": "Discuss weekly progress",
    "settings": {...},
    "createdAt": "2026-02-15T10:30:00.000Z"
  },
  "message": "Meeting created successfully. Store this data in your Firestore."
}
```

**Flutter Usage:**
```dart
// 1. Call API to create meeting
final response = await http.post(
  Uri.parse('$apiUrl/zoom/meeting'),
  headers: {'X-API-Key': apiKey, 'Content-Type': 'application/json'},
  body: json.encode({
    'userEmail': 'admin@example.com',
    'topic': 'Team Meeting',
    'startTime': '2026-02-20T10:00:00Z',
    'duration': 60,
  }),
);

// 2. Store meeting in Firestore
final meetingData = json.decode(response.body)['data'];
await FirebaseFirestore.instance
  .collection('meetings')
  .doc(meetingData['meetingId'])
  .set({
    'adminId': adminId,
    'topic': meetingData['topic'],
    'meetingId': meetingData['meetingId'],
    'joinUrl': meetingData['joinUrl'],
    'password': meetingData['password'],
    'startTime': meetingData['startTime'],
    'createdAt': FieldValue.serverTimestamp(),
  });
```

---

### 5. Get Meeting Details

**Endpoint:** `GET /api/zoom/meeting/:meetingId`

**Authentication:** Required

**Description:** Get details of a specific meeting

**Response:**
```json
{
  "success": true,
  "data": {
    "meetingId": "87654321098",
    "meetingNumber": 87654321098,
    "topic": "Team Weekly Standup",
    "startTime": "2026-02-20T10:00:00Z",
    "duration": 60,
    "timezone": "Asia/Kolkata",
    "joinUrl": "https://zoom.us/j/87654321098",
    "password": "xyz123",
    "hostEmail": "admin@example.com",
    "agenda": "Discuss weekly progress",
    "status": "waiting",
    "settings": {...}
  }
}
```

---

### 6. Update Meeting

**Endpoint:** `PATCH /api/zoom/meeting/:meetingId`

**Authentication:** Required

**Description:** Update an existing meeting

**Request Body:**
```json
{
  "topic": "Updated Meeting Title",
  "start_time": "2026-02-21T10:00:00Z",
  "duration": 90
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "meetingId": "87654321098",
    "updatedAt": "2026-02-15T11:00:00.000Z"
  },
  "message": "Meeting updated successfully. Update your Firestore record."
}
```

**Flutter Usage:**
```dart
// 1. Update via API
await http.patch(
  Uri.parse('$apiUrl/zoom/meeting/$meetingId'),
  headers: {'X-API-Key': apiKey, 'Content-Type': 'application/json'},
  body: json.encode({'topic': 'Updated Title'}),
);

// 2. Update in Firestore
await FirebaseFirestore.instance
  .collection('meetings')
  .doc(meetingId)
  .update({'topic': 'Updated Title'});
```

---

### 7. Delete Meeting

**Endpoint:** `DELETE /api/zoom/meeting/:meetingId`

**Authentication:** Required

**Description:** Delete a meeting from Zoom

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "meetingId": "87654321098",
    "deletedAt": "2026-02-15T11:00:00.000Z"
  },
  "message": "Meeting deleted from Zoom. Delete from your Firestore as well."
}
```

**Flutter Usage:**
```dart
// 1. Delete from Zoom
await http.delete(
  Uri.parse('$apiUrl/zoom/meeting/$meetingId'),
  headers: {'X-API-Key': apiKey},
);

// 2. Delete from Firestore
await FirebaseFirestore.instance
  .collection('meetings')
  .doc(meetingId)
  .delete();
```

---

### 8. Generate OBF Token (Single User)

**Endpoint:** `POST /api/zoom/obf-token`

**Authentication:** Required

**Description:** Generate an OBF token for a single user to join a meeting

**Request Body:**
```json
{
  "meetingId": "87654321098",
  "userName": "John Doe",
  "userEmail": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "meetingId": "87654321098",
    "userName": "John Doe",
    "userEmail": "john@example.com",
    "expiresIn": 7200,
    "expiresAt": "2026-02-15T12:30:00.000Z"
  },
  "message": "OBF token generated. Store this in Firestore under meeting participants."
}
```

**Flutter Usage:**
```dart
// 1. Generate token
final response = await http.post(
  Uri.parse('$apiUrl/zoom/obf-token'),
  headers: {'X-API-Key': apiKey, 'Content-Type': 'application/json'},
  body: json.encode({
    'meetingId': meetingId,
    'userName': 'John Doe',
    'userEmail': 'john@example.com',
  }),
);

// 2. Store in Firestore
final tokenData = json.decode(response.body)['data'];
await FirebaseFirestore.instance
  .collection('meetings')
  .doc(meetingId)
  .collection('participants')
  .doc(userId)
  .set({
    'obfToken': tokenData['token'],
    'expiresAt': tokenData['expiresAt'],
    'userName': tokenData['userName'],
  });
```

---

### 9. Generate OBF Tokens (Batch)

**Endpoint:** `POST /api/zoom/obf-tokens/batch`

**Authentication:** Required

**Description:** Generate OBF tokens for multiple users at once

**Request Body:**
```json
{
  "meetingId": "87654321098",
  "users": [
    {
      "userName": "John Doe",
      "userEmail": "john@example.com"
    },
    {
      "userName": "Jane Smith",
      "userEmail": "jane@example.com"
    },
    {
      "userName": "Bob Johnson",
      "userEmail": "bob@example.com"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "meetingId": "87654321098",
    "totalUsers": 3,
    "successCount": 3,
    "errorCount": 0,
    "tokens": [
      {
        "userName": "John Doe",
        "userEmail": "john@example.com",
        "token": "eyJhbGc...",
        "expiresIn": 7200,
        "expiresAt": "2026-02-15T12:30:00.000Z"
      },
      {
        "userName": "Jane Smith",
        "userEmail": "jane@example.com",
        "token": "eyJhbGc...",
        "expiresIn": 7200,
        "expiresAt": "2026-02-15T12:30:00.000Z"
      },
      {
        "userName": "Bob Johnson",
        "userEmail": "bob@example.com",
        "token": "eyJhbGc...",
        "expiresIn": 7200,
        "expiresAt": "2026-02-15T12:30:00.000Z"
      }
    ]
  },
  "message": "Batch tokens generated. Store each in Firestore."
}
```

**Flutter Usage:**
```dart
// 1. Get all users from Firestore
final usersSnapshot = await FirebaseFirestore.instance
  .collection('users')
  .where('adminId', isEqualTo: adminId)
  .get();

final users = usersSnapshot.docs.map((doc) => {
  'userName': doc['name'],
  'userEmail': doc['email'],
}).toList();

// 2. Generate tokens for all users
final response = await http.post(
  Uri.parse('$apiUrl/zoom/obf-tokens/batch'),
  headers: {'X-API-Key': apiKey, 'Content-Type': 'application/json'},
  body: json.encode({
    'meetingId': meetingId,
    'users': users,
  }),
);

// 3. Store each token in Firestore
final tokens = json.decode(response.body)['data']['tokens'];
final batch = FirebaseFirestore.instance.batch();

for (var tokenData in tokens) {
  final userDoc = usersSnapshot.docs.firstWhere(
    (doc) => doc['email'] == tokenData['userEmail']
  );
  
  final participantRef = FirebaseFirestore.instance
    .collection('meetings')
    .doc(meetingId)
    .collection('participants')
    .doc(userDoc.id);
  
  batch.set(participantRef, {
    'obfToken': tokenData['token'],
    'expiresAt': tokenData['expiresAt'],
    'userName': tokenData['userName'],
  });
}

await batch.commit();
```

---

### 10. List Zoom Users

**Endpoint:** `GET /api/zoom/users`

**Authentication:** Required

**Description:** Get all users in your Zoom account

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 5,
    "users": [
      {
        "id": "abc123",
        "email": "admin@example.com",
        "first_name": "Admin",
        "last_name": "User",
        "type": 2
      },
      ...
    ]
  }
}
```

---

## Complete Flutter Workflow Example

### Step 1: Admin Creates Meeting

```dart
class ZoomService {
  final String apiUrl = 'http://your-api-url.com/api/zoom';
  final String apiKey = 'your-api-key';
  
  Future<String> createMeeting({
    required String adminEmail,
    required String topic,
    required DateTime startTime,
    required int duration,
  }) async {
    // 1. Call API to create meeting
    final response = await http.post(
      Uri.parse('$apiUrl/meeting'),
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: json.encode({
        'userEmail': adminEmail,
        'topic': topic,
        'startTime': startTime.toIso8601String(),
        'duration': duration,
        'timezone': 'Asia/Kolkata',
      }),
    );
    
    final meetingData = json.decode(response.body)['data'];
    
    // 2. Store in Firestore
    await FirebaseFirestore.instance
      .collection('meetings')
      .doc(meetingData['meetingId'])
      .set({
        'adminId': FirebaseAuth.instance.currentUser!.uid,
        'topic': meetingData['topic'],
        'meetingId': meetingData['meetingId'],
        'meetingNumber': meetingData['meetingNumber'],
        'joinUrl': meetingData['joinUrl'],
        'password': meetingData['password'],
        'startTime': meetingData['startTime'],
        'duration': meetingData['duration'],
        'createdAt': FieldValue.serverTimestamp(),
      });
    
    return meetingData['meetingId'];
  }
}
```

### Step 2: Generate Tokens for Users

```dart
Future<void> generateUserTokens(String meetingId) async {
  // 1. Get all users from Firestore
  final adminId = FirebaseAuth.instance.currentUser!.uid;
  final usersSnapshot = await FirebaseFirestore.instance
    .collection('users')
    .where('adminId', isEqualTo: adminId)
    .get();
  
  final users = usersSnapshot.docs.map((doc) => {
    'userName': doc['name'],
    'userEmail': doc['email'],
  }).toList();
  
  // 2. Generate tokens via API
  final response = await http.post(
    Uri.parse('$apiUrl/obf-tokens/batch'),
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: json.encode({
      'meetingId': meetingId,
      'users': users,
    }),
  );
  
  // 3. Store tokens in Firestore
  final tokens = json.decode(response.body)['data']['tokens'];
  final batch = FirebaseFirestore.instance.batch();
  
  for (var tokenData in tokens) {
    final userDoc = usersSnapshot.docs.firstWhere(
      (doc) => doc['email'] == tokenData['userEmail']
    );
    
    final participantRef = FirebaseFirestore.instance
      .collection('meetings')
      .doc(meetingId)
      .collection('participants')
      .doc(userDoc.id);
    
    batch.set(participantRef, {
      'obfToken': tokenData['token'],
      'expiresAt': tokenData['expiresAt'],
      'userName': tokenData['userName'],
      'userEmail': tokenData['userEmail'],
      'joined': false,
    });
  }
  
  await batch.commit();
}
```

### Step 3: User Joins Meeting

```dart
Future<void> joinMeeting(String meetingId) async {
  final userId = FirebaseAuth.instance.currentUser!.uid;
  
  // 1. Get OBF token from Firestore
  final participantDoc = await FirebaseFirestore.instance
    .collection('meetings')
    .doc(meetingId)
    .collection('participants')
    .doc(userId)
    .get();
  
  final obfToken = participantDoc['obfToken'];
  
  // 2. Get meeting details
  final meetingDoc = await FirebaseFirestore.instance
    .collection('meetings')
    .doc(meetingId)
    .get();
  
  // 3. Join via Zoom SDK
  ZoomMeetingOptions options = ZoomMeetingOptions(
    meetingId: meetingDoc['meetingNumber'].toString(),
    meetingPassword: meetingDoc['password'],
    zak: obfToken,
    displayName: participantDoc['userName'],
  );
  
  await ZoomView().joinMeeting(context, options);
}
```

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error type",
  "details": "Detailed error message"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Validation error
- `401` - Authentication error (invalid API key)
- `404` - Resource not found
- `429` - Rate limit exceeded
- `500` - Server error

---

## Security Best Practices

1. **Never expose API key in Flutter app code**
   - Store in secure storage
   - Or use Cloud Functions to proxy requests

2. **Validate user permissions in Flutter**
   - Check if user has access to meeting before calling API
   - Use Firestore security rules

3. **Rate limiting**
   - Built-in rate limiter (100 req/15min per IP)
   - Adjust in middleware if needed

4. **HTTPS in production**
   - Always use HTTPS
   - Never send API key over HTTP

---

## Deployment

### Option 1: Heroku

```bash
heroku create your-app-name
heroku config:set API_KEY=your-api-key
heroku config:set ZOOM_CLIENT_ID=your-client-id
git push heroku main
```

### Option 2: Google Cloud Run

```bash
gcloud run deploy zoom-api \
  --source . \
  --set-env-vars API_KEY=your-api-key
```

### Option 3: AWS EC2

1. Set up EC2 instance
2. Install Node.js
3. Copy files and run `npm install`
4. Use PM2 for process management:
```bash
pm2 start server.js --name zoom-api
pm2 startup
pm2 save
```

---

## FAQ

**Q: Do I need Firebase Admin SDK?**
A: No! This API doesn't use Firebase at all. Your Flutter app handles all Firebase operations.

**Q: Where do I store user data?**
A: In Firestore, directly from your Flutter app using Firebase Client SDK.

**Q: How does authentication work?**
A: Simple API key in the header. No JWT, no Firebase tokens.

**Q: Can I use this with React/Angular?**
A: Yes! It works with any client that can make HTTP requests.

**Q: What about token expiry?**
A: ZAK tokens expire in 2 hours, OBF tokens in 2 hours. Regenerate when needed.

---

## Support

For issues:
- Check the documentation
- Review error messages
- Check Zoom API logs
- Verify API key and Zoom credentials

---

**This API is a simple, standalone Zoom wrapper. All user management and data storage happens in your Flutter app with Firebase Client SDK!** 🚀
