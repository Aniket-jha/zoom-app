# Zoom API Wrapper

A lightweight, standalone Zoom API wrapper designed for Flutter apps using Firebase Client SDK.

## 🎯 What This Does

This is a **pure Zoom API wrapper** - it only handles Zoom operations. Your Flutter app manages everything else (authentication, database, user management) using Firebase Client SDK directly.

## ✨ Key Features

- ✅ **No Firebase Admin SDK** - Completely independent
- ✅ **Simple API Key Auth** - No complex token management
- ✅ **Lightweight** - Only 8 dependencies
- ✅ **Pure Zoom Operations** - ZAK tokens, meetings, OBF tokens
- ✅ **Flutter-First Design** - Built for Firebase Client SDK workflow
- ✅ **Easy Integration** - Simple HTTP requests

## 🚀 Quick Start

### 1. Install

```bash
npm install
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env with your credentials
```

Required environment variables:
```env
API_KEY=your-secure-api-key          # Generate with: openssl rand -hex 32
ZOOM_ACCOUNT_ID=your-zoom-account-id
ZOOM_CLIENT_ID=your-zoom-client-id
ZOOM_CLIENT_SECRET=your-zoom-client-secret
```

### 3. Run

```bash
npm run dev  # Development
npm start    # Production
```

## 📡 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/zoom/zak-token` | POST | Generate admin ZAK token |
| `/api/zoom/meeting` | POST | Create meeting |
| `/api/zoom/meeting/:id` | GET | Get meeting details |
| `/api/zoom/meeting/:id` | PATCH | Update meeting |
| `/api/zoom/meeting/:id` | DELETE | Delete meeting |
| `/api/zoom/obf-token` | POST | Generate user OBF token |
| `/api/zoom/obf-tokens/batch` | POST | Generate multiple OBF tokens |
| `/api/zoom/users` | GET | List Zoom users |

## 📖 Swagger Docs

Interactive docs:

- `http://localhost:3000/api/docs`
- `http://localhost:3000/api/docs.json`

## 🔐 Authentication

All requests require API key in header:

```bash
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/health
```

## 📱 Flutter Integration

### 1. Create Meeting

```dart
final response = await http.post(
  Uri.parse('$apiUrl/zoom/meeting'),
  headers: {
    'X-API-Key': apiKey,
    'Content-Type': 'application/json',
  },
  body: json.encode({
    'userEmail': 'admin@example.com',
    'topic': 'Team Meeting',
    'startTime': '2026-02-20T10:00:00Z',
    'duration': 60,
  }),
);

// Store in Firestore
final meeting = json.decode(response.body)['data'];
await FirebaseFirestore.instance
  .collection('meetings')
  .doc(meeting['meetingId'])
  .set(meeting);
```

### 2. Generate User Tokens

```dart
final response = await http.post(
  Uri.parse('$apiUrl/zoom/obf-tokens/batch'),
  headers: {'X-API-Key': apiKey, 'Content-Type': 'application/json'},
  body: json.encode({
    'meetingId': meetingId,
    'users': [
      {'userName': 'John', 'userEmail': 'john@example.com'},
      {'userName': 'Jane', 'userEmail': 'jane@example.com'},
    ],
  }),
);

// Store tokens in Firestore
final tokens = json.decode(response.body)['data']['tokens'];
for (var token in tokens) {
  await FirebaseFirestore.instance
    .collection('meetings')
    .doc(meetingId)
    .collection('participants')
    .doc(userId)
    .set({'obfToken': token['token']});
}
```

### 3. Join Meeting

```dart
// Get token from Firestore
final participant = await FirebaseFirestore.instance
  .collection('meetings/$meetingId/participants')
  .doc(userId)
  .get();

// Join with Zoom SDK
ZoomMeetingOptions options = ZoomMeetingOptions(
  meetingId: meetingNumber,
  meetingPassword: password,
  zak: participant['obfToken'],
  displayName: userName,
);

await ZoomView().joinMeeting(context, options);
```

## 🏗️ Project Structure

```
├── server.js                    # Main entry point
├── controllers/
│   └── zoom.controller.js       # Request handlers
├── services/
│   └── zoom.service.js          # Zoom API logic
├── routes/
│   └── zoom.routes.js           # Route definitions
├── middleware/
│   ├── auth.middleware.js       # API key auth
│   └── validation.middleware.js # Input validation
└── package.json                 # Dependencies
```

## 📦 Dependencies

- **express** - Web framework
- **axios** - HTTP client for Zoom API
- **jsonwebtoken** - SDK JWT generation
- **express-validator** - Input validation
- **cors** - Cross-origin support
- **dotenv** - Environment variables
- **swagger-jsdoc** - OpenAPI spec generation
- **swagger-ui-express** - Swagger UI

## 🔄 Complete Workflow

```
1. Flutter: Admin creates account (Firebase Auth)
2. Flutter: Stores admin in Firestore
3. Flutter → API: Generate ZAK token
4. Flutter: Stores ZAK in Firestore
5. Flutter → API: Create meeting
6. Flutter: Stores meeting in Firestore
7. Flutter → API: Generate OBF tokens for users
8. Flutter: Stores tokens in Firestore
9. Flutter: Users fetch tokens from Firestore
10. Flutter: Users join with Zoom SDK + OBF token
```

## 🆚 vs Firebase Admin Version

| Feature | This Version | Firebase Admin Version |
|---------|--------------|------------------------|
| Firebase Dependency | ❌ None | ✅ Required |
| Setup Complexity | Low | High |
| Client Control | Full | Partial |
| Authentication | API Key | Firebase ID Tokens |
| Data Storage | Client-side | Server-side |
| Best For | Firebase Client SDK | Firebase Admin SDK |

## ⚙️ Configuration

### Zoom App Setup

1. Go to [Zoom Marketplace](https://marketplace.zoom.us/)
2. Create **Server-to-Server OAuth** app
3. Add scopes:
   - `meeting:write:admin`
   - `meeting:read:admin`
   - `user:read:admin`
4. Get Account ID, Client ID, Client Secret
5. Add to `.env`

### API Key Generation

```bash
# Generate secure API key
openssl rand -hex 32
```

Add to `.env` and share with Flutter app securely.

## 🚀 Deployment

### Heroku

```bash
heroku create
heroku config:set API_KEY=your-key
heroku config:set ZOOM_CLIENT_ID=your-id
git push heroku main
```

### Docker

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

## 📚 Documentation

- [Complete API Documentation](./API_DOCUMENTATION.md)
- [Flutter Integration Examples](./FLUTTER_INTEGRATION.md)

## 🔒 Security

- ✅ API key authentication
- ✅ Input validation
- ✅ Rate limiting (100 req/15min)
- ✅ CORS enabled
- ✅ Environment variable protection

## 🐛 Troubleshooting

**API Key Invalid**
- Check `.env` file
- Verify header: `X-API-Key`

**Zoom API Error**
- Verify Zoom credentials
- Check app is activated
- Confirm user email exists in Zoom

**Connection Refused**
- Check server is running
- Verify PORT in `.env`

## 📄 License

MIT

## 🤝 Contributing

Pull requests welcome!

---

**Built for Flutter + Firebase Client SDK** 🚀
