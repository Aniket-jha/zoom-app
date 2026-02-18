# Flutter Integration Guide

Complete guide for integrating this Zoom API wrapper with your Flutter app using Firebase Client SDK.

## Architecture Overview

```
Flutter App
├── Firebase Client SDK (Direct Access)
│   ├── Firebase Auth - Login/Signup
│   ├── Firestore - Read/Write all data
│   └── No server-side Firebase needed
│
└── HTTP Calls to Zoom API Wrapper
    ├── Create meetings
    ├── Generate tokens
    └── Manage Zoom operations
```

---

## Setup

### 1. Add Dependencies

```yaml
# pubspec.yaml
dependencies:
  firebase_core: ^2.24.0
  firebase_auth: ^4.15.0
  cloud_firestore: ^4.13.0
  http: ^1.1.0
  flutter_zoom_sdk: ^0.2.0  # For Zoom meeting SDK
```

### 2. Configure API

```dart
// lib/config/api_config.dart
class ApiConfig {
  static const String baseUrl = 'http://your-api-url.com/api/zoom';
  static const String apiKey = 'your-api-key-here'; // Store securely!
  
  static Map<String, String> get headers => {
    'X-API-Key': apiKey,
    'Content-Type': 'application/json',
  };
}
```

**⚠️ Security Note:** In production, store API key in:
- Flutter Secure Storage
- Environment variables
- Cloud Functions (as proxy)

---

## Complete Implementation

### Service Class

```dart
// lib/services/zoom_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../config/api_config.dart';

class ZoomService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  /// Generate ZAK token for admin
  Future<void> generateAdminZakToken(String adminEmail) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/zak-token'),
        headers: ApiConfig.headers,
        body: json.encode({'userEmail': adminEmail}),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body)['data'];
        
        // Store ZAK token in Firestore
        await _firestore
          .collection('admins')
          .doc(_auth.currentUser!.uid)
          .update({
            'zakToken': data['zakToken'],
            'zakTokenExpiresAt': data['expiresAt'],
            'zakTokenUpdatedAt': FieldValue.serverTimestamp(),
          });
      } else {
        throw Exception('Failed to generate ZAK token');
      }
    } catch (e) {
      print('Error generating ZAK token: $e');
      rethrow;
    }
  }

  /// Create a Zoom meeting
  Future<String?> createMeeting({
    required String adminEmail,
    required String topic,
    required DateTime startTime,
    required int duration,
    String timezone = 'UTC',
    String? agenda,
    Map<String, dynamic>? settings,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/meeting'),
        headers: ApiConfig.headers,
        body: json.encode({
          'userEmail': adminEmail,
          'topic': topic,
          'startTime': startTime.toIso8601String(),
          'duration': duration,
          'timezone': timezone,
          'agenda': agenda ?? '',
          'settings': settings ?? {},
        }),
      );

      if (response.statusCode == 201) {
        final meetingData = json.decode(response.body)['data'];
        
        // Store meeting in Firestore
        await _firestore
          .collection('meetings')
          .doc(meetingData['meetingId'])
          .set({
            'adminId': _auth.currentUser!.uid,
            'meetingId': meetingData['meetingId'],
            'meetingNumber': meetingData['meetingNumber'],
            'topic': meetingData['topic'],
            'startTime': meetingData['startTime'],
            'duration': meetingData['duration'],
            'timezone': meetingData['timezone'],
            'joinUrl': meetingData['joinUrl'],
            'password': meetingData['password'],
            'hostEmail': meetingData['hostEmail'],
            'agenda': meetingData['agenda'],
            'status': 'scheduled',
            'createdAt': FieldValue.serverTimestamp(),
          });

        return meetingData['meetingId'];
      } else {
        throw Exception('Failed to create meeting');
      }
    } catch (e) {
      print('Error creating meeting: $e');
      rethrow;
    }
  }

  /// Generate OBF tokens for all users under admin
  Future<void> generateUserTokens(String meetingId) async {
    try {
      final adminId = _auth.currentUser!.uid;
      
      // 1. Get all users from Firestore
      final usersSnapshot = await _firestore
        .collection('users')
        .where('adminId', isEqualTo: adminId)
        .get();

      if (usersSnapshot.docs.isEmpty) {
        print('No users found for this admin');
        return;
      }

      // 2. Prepare users array for API
      final users = usersSnapshot.docs.map((doc) => {
        'userName': doc['name'],
        'userEmail': doc['email'],
      }).toList();

      // 3. Call API to generate tokens
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/obf-tokens/batch'),
        headers: ApiConfig.headers,
        body: json.encode({
          'meetingId': meetingId,
          'users': users,
        }),
      );

      if (response.statusCode == 200) {
        final tokens = json.decode(response.body)['data']['tokens'];
        
        // 4. Store tokens in Firestore using batch write
        final batch = _firestore.batch();
        
        for (var tokenData in tokens) {
          // Find the user document
          final userDoc = usersSnapshot.docs.firstWhere(
            (doc) => doc['email'] == tokenData['userEmail'],
          );
          
          // Create participant document
          final participantRef = _firestore
            .collection('meetings')
            .doc(meetingId)
            .collection('participants')
            .doc(userDoc.id);
          
          batch.set(participantRef, {
            'userId': userDoc.id,
            'userName': tokenData['userName'],
            'userEmail': tokenData['userEmail'],
            'obfToken': tokenData['token'],
            'tokenExpiresAt': tokenData['expiresAt'],
            'joined': false,
            'invitedAt': FieldValue.serverTimestamp(),
          });
        }
        
        await batch.commit();
        print('Generated tokens for ${tokens.length} users');
      } else {
        throw Exception('Failed to generate tokens');
      }
    } catch (e) {
      print('Error generating user tokens: $e');
      rethrow;
    }
  }

  /// Get meeting details from Firestore
  Future<Map<String, dynamic>?> getMeeting(String meetingId) async {
    try {
      final doc = await _firestore
        .collection('meetings')
        .doc(meetingId)
        .get();
      
      return doc.exists ? doc.data() : null;
    } catch (e) {
      print('Error getting meeting: $e');
      return null;
    }
  }

  /// Get user's OBF token for a meeting
  Future<String?> getUserToken(String meetingId, String userId) async {
    try {
      final doc = await _firestore
        .collection('meetings')
        .doc(meetingId)
        .collection('participants')
        .doc(userId)
        .get();
      
      if (doc.exists) {
        final data = doc.data()!;
        
        // Check if token is expired
        final expiresAt = DateTime.parse(data['tokenExpiresAt']);
        if (expiresAt.isBefore(DateTime.now())) {
          print('Token expired, regenerate needed');
          return null;
        }
        
        return data['obfToken'];
      }
      
      return null;
    } catch (e) {
      print('Error getting user token: $e');
      return null;
    }
  }

  /// Update meeting
  Future<bool> updateMeeting(String meetingId, Map<String, dynamic> updates) async {
    try {
      final response = await http.patch(
        Uri.parse('${ApiConfig.baseUrl}/meeting/$meetingId'),
        headers: ApiConfig.headers,
        body: json.encode(updates),
      );

      if (response.statusCode == 200) {
        // Update Firestore
        await _firestore
          .collection('meetings')
          .doc(meetingId)
          .update({
            ...updates,
            'updatedAt': FieldValue.serverTimestamp(),
          });
        
        return true;
      }
      
      return false;
    } catch (e) {
      print('Error updating meeting: $e');
      return false;
    }
  }

  /// Delete meeting
  Future<bool> deleteMeeting(String meetingId) async {
    try {
      final response = await http.delete(
        Uri.parse('${ApiConfig.baseUrl}/meeting/$meetingId'),
        headers: ApiConfig.headers,
      );

      if (response.statusCode == 200) {
        // Delete from Firestore (including subcollections)
        await _deleteMeetingAndParticipants(meetingId);
        return true;
      }
      
      return false;
    } catch (e) {
      print('Error deleting meeting: $e');
      return false;
    }
  }

  /// Helper: Delete meeting and all participants
  Future<void> _deleteMeetingAndParticipants(String meetingId) async {
    // Delete participants
    final participants = await _firestore
      .collection('meetings')
      .doc(meetingId)
      .collection('participants')
      .get();
    
    final batch = _firestore.batch();
    
    for (var doc in participants.docs) {
      batch.delete(doc.reference);
    }
    
    // Delete meeting document
    batch.delete(_firestore.collection('meetings').doc(meetingId));
    
    await batch.commit();
  }

  /// Stream meetings for admin
  Stream<List<Map<String, dynamic>>> streamAdminMeetings() {
    final adminId = _auth.currentUser!.uid;
    
    return _firestore
      .collection('meetings')
      .where('adminId', isEqualTo: adminId)
      .orderBy('startTime', descending: false)
      .snapshots()
      .map((snapshot) => snapshot.docs
        .map((doc) => {'id': doc.id, ...doc.data()})
        .toList());
  }

  /// Stream meetings for user
  Stream<List<Map<String, dynamic>>> streamUserMeetings() {
    final userId = _auth.currentUser!.uid;
    
    return _firestore
      .collectionGroup('participants')
      .where('userId', isEqualTo: userId)
      .snapshots()
      .asyncMap((snapshot) async {
        final List<Map<String, dynamic>> meetings = [];
        
        for (var doc in snapshot.docs) {
          final meetingId = doc.reference.parent.parent!.id;
          final meeting = await getMeeting(meetingId);
          if (meeting != null) {
            meetings.add({
              ...meeting,
              'participantData': doc.data(),
            });
          }
        }
        
        return meetings;
      });
  }
}
```

---

## UI Screens

### Admin: Create Meeting Screen

```dart
// lib/screens/admin/create_meeting_screen.dart
import 'package:flutter/material.dart';
import '../../services/zoom_service.dart';

class CreateMeetingScreen extends StatefulWidget {
  @override
  _CreateMeetingScreenState createState() => _CreateMeetingScreenState();
}

class _CreateMeetingScreenState extends State<CreateMeetingScreen> {
  final _formKey = GlobalKey<FormState>();
  final _zoomService = ZoomService();
  
  String _topic = '';
  DateTime _startTime = DateTime.now().add(Duration(hours: 1));
  int _duration = 60;
  bool _isLoading = false;

  Future<void> _createMeeting() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isLoading = true);
    
    try {
      final adminEmail = 'admin@example.com'; // Get from user profile
      
      // Create meeting
      final meetingId = await _zoomService.createMeeting(
        adminEmail: adminEmail,
        topic: _topic,
        startTime: _startTime,
        duration: _duration,
        timezone: 'Asia/Kolkata',
      );
      
      if (meetingId != null) {
        // Generate tokens for all users
        await _zoomService.generateUserTokens(meetingId);
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Meeting created successfully!')),
        );
        
        Navigator.pop(context);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Create Meeting')),
      body: Padding(
        padding: EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              TextFormField(
                decoration: InputDecoration(labelText: 'Meeting Topic'),
                validator: (value) => 
                  value?.isEmpty ?? true ? 'Required' : null,
                onChanged: (value) => _topic = value,
              ),
              SizedBox(height: 16),
              ListTile(
                title: Text('Start Time'),
                subtitle: Text(_startTime.toString()),
                trailing: Icon(Icons.calendar_today),
                onTap: () async {
                  final date = await showDatePicker(
                    context: context,
                    initialDate: _startTime,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(Duration(days: 365)),
                  );
                  if (date != null) {
                    final time = await showTimePicker(
                      context: context,
                      initialTime: TimeOfDay.fromDateTime(_startTime),
                    );
                    if (time != null) {
                      setState(() {
                        _startTime = DateTime(
                          date.year, date.month, date.day,
                          time.hour, time.minute,
                        );
                      });
                    }
                  }
                },
              ),
              SizedBox(height: 16),
              DropdownButtonFormField<int>(
                value: _duration,
                decoration: InputDecoration(labelText: 'Duration (minutes)'),
                items: [30, 60, 90, 120]
                  .map((d) => DropdownMenuItem(
                    value: d,
                    child: Text('$d minutes'),
                  ))
                  .toList(),
                onChanged: (value) => setState(() => _duration = value!),
              ),
              Spacer(),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _createMeeting,
                  child: _isLoading
                    ? CircularProgressIndicator()
                    : Text('Create Meeting'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

### User: Meetings List Screen

```dart
// lib/screens/user/meetings_list_screen.dart
import 'package:flutter/material.dart';
import '../../services/zoom_service.dart';

class MeetingsListScreen extends StatelessWidget {
  final _zoomService = ZoomService();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('My Meetings')),
      body: StreamBuilder<List<Map<String, dynamic>>>(
        stream: _zoomService.streamUserMeetings(),
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }
          
          if (!snapshot.hasData) {
            return Center(child: CircularProgressIndicator());
          }
          
          final meetings = snapshot.data!;
          
          if (meetings.isEmpty) {
            return Center(child: Text('No meetings scheduled'));
          }
          
          return ListView.builder(
            itemCount: meetings.length,
            itemBuilder: (context, index) {
              final meeting = meetings[index];
              final startTime = DateTime.parse(meeting['startTime']);
              
              return Card(
                margin: EdgeInsets.all(8),
                child: ListTile(
                  title: Text(meeting['topic']),
                  subtitle: Text(
                    'Start: ${startTime.toString()}\n'
                    'Duration: ${meeting['duration']} min',
                  ),
                  trailing: ElevatedButton(
                    onPressed: () => _joinMeeting(context, meeting),
                    child: Text('Join'),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  Future<void> _joinMeeting(
    BuildContext context,
    Map<String, dynamic> meeting,
  ) async {
    try {
      // Get OBF token from participant data
      final obfToken = meeting['participantData']['obfToken'];
      
      if (obfToken == null) {
        throw Exception('No token available');
      }
      
      // Check if token expired
      final expiresAt = DateTime.parse(
        meeting['participantData']['tokenExpiresAt']
      );
      
      if (expiresAt.isBefore(DateTime.now())) {
        throw Exception('Token expired. Please contact admin.');
      }
      
      // Join meeting using Zoom SDK
      final ZoomMeetingOptions options = ZoomMeetingOptions(
        userId: meeting['participantData']['userEmail'],
        meetingId: meeting['meetingNumber'].toString(),
        meetingPassword: meeting['password'],
        disableDialIn: true,
        disableDrive: true,
        disableInvite: true,
        disableShare: true,
        noAudio: false,
        noDisconnectAudio: false,
      );
      
      await ZoomView().joinMeeting(
        context,
        options,
        obfToken, // OBF token
      );
      
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error joining meeting: $e')),
      );
    }
  }
}
```

---

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    // Admins collection
    match /admins/{adminId} {
      allow read: if isAuthenticated();
      allow write: if request.auth.uid == adminId || isAdmin();
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin();
      allow update, delete: if request.auth.uid == userId || isAdmin();
    }
    
    // Meetings collection
    match /meetings/{meetingId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin();
      allow update, delete: if isAdmin() && 
        resource.data.adminId == request.auth.uid;
      
      // Participants subcollection
      match /participants/{participantId} {
        allow read: if isAuthenticated() && 
          (request.auth.uid == participantId || isAdmin());
        allow write: if isAdmin();
      }
    }
  }
}
```

---

## Best Practices

### 1. Token Management

```dart
// Check token expiry before using
Future<String?> getValidToken(String meetingId, String userId) async {
  final doc = await FirebaseFirestore.instance
    .collection('meetings/$meetingId/participants')
    .doc(userId)
    .get();
  
  if (!doc.exists) return null;
  
  final expiresAt = DateTime.parse(doc['tokenExpiresAt']);
  
  if (expiresAt.isBefore(DateTime.now())) {
    // Token expired - regenerate
    // Call admin to regenerate tokens
    return null;
  }
  
  return doc['obfToken'];
}
```

### 2. Error Handling

```dart
try {
  final meetingId = await zoomService.createMeeting(...);
} on HttpException catch (e) {
  // HTTP error
  showError('Network error: ${e.message}');
} on FirebaseException catch (e) {
  // Firebase error
  showError('Database error: ${e.message}');
} catch (e) {
  // Other errors
  showError('Unexpected error: $e');
}
```

### 3. Secure API Key Storage

```dart
// Use flutter_secure_storage
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorage {
  static const _storage = FlutterSecureStorage();
  
  static Future<void> saveApiKey(String key) async {
    await _storage.write(key: 'zoom_api_key', value: key);
  }
  
  static Future<String?> getApiKey() async {
    return await _storage.read(key: 'zoom_api_key');
  }
}
```

---

## Complete Example App

See the `example/` folder for a complete Flutter app demonstrating:
- Admin dashboard
- Meeting creation
- User meeting list
- Zoom SDK integration
- Real-time updates with Firestore

---

## Troubleshooting

**Token expired error:**
- Regenerate tokens using API
- Check `tokenExpiresAt` field

**Meeting join fails:**
- Verify Zoom SDK is properly initialized
- Check OBF token is valid
- Ensure meeting password is correct

**No meetings showing:**
- Check Firestore security rules
- Verify user has participant documents
- Check collection names match

---

**This approach gives you full control with Firebase Client SDK while using the API only for Zoom operations!** 🚀
