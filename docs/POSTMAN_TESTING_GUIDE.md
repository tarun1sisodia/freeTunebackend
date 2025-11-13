# Postman Testing Guide - FreeTune Songs API

**Date:** 2025-11-13  
**Purpose:** Test all Songs API endpoints using Postman

---

## 🚀 Getting Started

### 1. Prerequisites
- ✅ Server running on `http://localhost:3000` (or your port)
- ✅ Supabase configured
- ✅ Cloudflare R2 configured
- ✅ Postman installed

### 2. Environment Setup in Postman

Create a new environment with these variables:

```
BASE_URL = http://localhost:3000/api/v1
ACCESS_TOKEN = (will be set after login)
USER_EMAIL = test@example.com
USER_PASSWORD = Test123456!
SONG_ID = (will be set after upload)
PLAYLIST_ID = (will be set after creation)
```

---

## 📝 Test Sequence

### **PHASE 1: Authentication (2 tests)**

#### Test 1: Register User
```
POST {{BASE_URL}}/auth/register
Content-Type: application/json

{
  "email": "{{USER_EMAIL}}",
  "password": "{{USER_PASSWORD}}",
  "username": "testuser",
  "fullName": "Test User"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "user": {
      "id": "...",
      "email": "test@example.com",
      "username": "testuser",
      "fullName": "Test User",
      "emailVerified": false
    },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  },
  "statusCode": 201
}
```

**Postman Test Script:**
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Response has access token", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.accessToken).to.exist;
    pm.environment.set("ACCESS_TOKEN", jsonData.data.accessToken);
});
```

---

#### Test 2: Login User
```
POST {{BASE_URL}}/auth/login
Content-Type: application/json

{
  "email": "{{USER_EMAIL}}",
  "password": "{{USER_PASSWORD}}"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "...",
      "email": "test@example.com",
      "username": "testuser"
    },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  },
  "statusCode": 200
}
```

**Postman Test Script:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Access token saved", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.accessToken).to.exist;
    pm.environment.set("ACCESS_TOKEN", jsonData.data.accessToken);
});
```

---

### **PHASE 2: Song Upload & Management (4 tests)**

#### Test 3: Upload Song
```
POST {{BASE_URL}}/songs/upload
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: multipart/form-data

Form Data:
- audio: [Select audio file - MP3/FLAC/WAV]
- title: "Test Song"
- artist: "Test Artist"
- album: "Test Album"
- duration_ms: 240000
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Song uploaded successfully",
  "data": {
    "song": {
      "id": "...",
      "title": "Test Song",
      "artist": "Test Artist",
      "album": "Test Album",
      "duration_ms": 240000,
      "r2_key": "original/...",
      "play_count": 0
    },
    "upload": {
      "size": 5242880,
      "key": "original/...",
      "url": "https://..."
    }
  },
  "statusCode": 201
}
```

**Postman Test Script:**
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Song ID saved", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.song.id).to.exist;
    pm.environment.set("SONG_ID", jsonData.data.song.id);
});
```

---

#### Test 4: Get All Songs
```
GET {{BASE_URL}}/songs?page=1&limit=20
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Songs fetched successfully",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  },
  "statusCode": 200
}
```

**Postman Test Script:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Has pagination", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.pagination).to.exist;
});
```

---

#### Test 5: Get Song by ID
```
GET {{BASE_URL}}/songs/{{SONG_ID}}
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Song fetched successfully",
  "data": {
    "id": "...",
    "title": "Test Song",
    "artist": "Test Artist",
    "album": "Test Album"
  },
  "statusCode": 200
}
```

**Postman Test Script:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Song details match", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.title).to.eql("Test Song");
});
```

---

#### Test 6: Update Song Metadata
```
PATCH {{BASE_URL}}/songs/{{SONG_ID}}/metadata
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "title": "Updated Test Song",
  "artist": "Updated Artist"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Song metadata updated successfully",
  "data": {
    "id": "...",
    "title": "Updated Test Song",
    "artist": "Updated Artist"
  },
  "statusCode": 200
}
```

**Postman Test Script:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Title updated", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.title).to.eql("Updated Test Song");
});
```

---

### **PHASE 3: Streaming & Playback (4 tests)**

#### Test 7: Get Stream URL
```
GET {{BASE_URL}}/songs/{{SONG_ID}}/stream-url?quality=high
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Stream URL generated successfully",
  "data": {
    "streamUrl": "https://r2.cloudflarestorage.com/...",
    "song": {
      "id": "...",
      "title": "Updated Test Song",
      "artist": "Updated Artist"
    },
    "quality": "high",
    "expiresIn": 3600
  },
  "statusCode": 200
}
```

**Postman Test Script:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Has stream URL", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.streamUrl).to.exist;
});
```

---

#### Test 8: Track Song Play
```
POST {{BASE_URL}}/songs/{{SONG_ID}}/play
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "session_id": "test-session-123",
  "metadata": {
    "device": "postman"
  }
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Play tracked successfully",
  "data": null,
  "statusCode": 200
}
```

**Postman Test Script:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});
```

---

#### Test 9: Track Playback Progress
```
POST {{BASE_URL}}/songs/{{SONG_ID}}/playback
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "progress_ms": 120000,
  "duration_ms": 240000,
  "completed": false,
  "session_id": "test-session-123",
  "quality": "high",
  "device_type": "postman"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Playback tracked successfully",
  "data": {
    "tracked": true,
    "progress_ms": 120000,
    "completed": false
  },
  "statusCode": 200
}
```

---

#### Test 10: Get File Info
```
GET {{BASE_URL}}/songs/{{SONG_ID}}/file-info
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "File metadata retrieved successfully",
  "data": {
    "song": {
      "id": "...",
      "title": "Updated Test Song"
    },
    "file": {
      "size": 5242880,
      "contentType": "audio/mpeg",
      "lastModified": "2025-11-13T..."
    }
  },
  "statusCode": 200
}
```

---

### **PHASE 4: Search & Discovery (3 tests)**

#### Test 11: Search Songs
```
GET {{BASE_URL}}/songs/search?q=test&page=1&limit=10
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Search completed successfully",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  },
  "statusCode": 200
}
```

---

#### Test 12: Get Popular Songs
```
GET {{BASE_URL}}/songs/popular?page=1&limit=20
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Popular songs fetched successfully",
  "data": [...],
  "pagination": {...},
  "statusCode": 200
}
```

---

#### Test 13: Get Recently Played
```
GET {{BASE_URL}}/songs/recently-played?limit=20
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Recently played songs fetched successfully",
  "data": {
    "songs": [...],
    "count": 1
  },
  "statusCode": 200
}
```

---

### **PHASE 5: Favorites (3 tests)**

#### Test 14: Add to Favorites
```
POST {{BASE_URL}}/songs/{{SONG_ID}}/favorite
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Added to favorites",
  "data": {
    "isFavorite": true
  },
  "statusCode": 201
}
```

---

#### Test 15: Get Favorites
```
GET {{BASE_URL}}/songs/favorites?page=1&limit=50
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Favorite songs fetched successfully",
  "data": [...],
  "pagination": {...},
  "statusCode": 200
}
```

---

#### Test 16: Remove from Favorites
```
POST {{BASE_URL}}/songs/{{SONG_ID}}/favorite
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Removed from favorites",
  "data": {
    "isFavorite": false
  },
  "statusCode": 200
}
```

---

### **PHASE 6: Playlists (7 tests)**

#### Test 17: Create Playlist
```
POST {{BASE_URL}}/playlists
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "name": "Test Playlist",
  "description": "My test playlist",
  "is_public": false
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Playlist created successfully",
  "data": {
    "id": "...",
    "name": "Test Playlist",
    "description": "My test playlist",
    "is_public": false,
    "song_ids": []
  },
  "statusCode": 201
}
```

**Postman Test Script:**
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Playlist ID saved", function () {
    var jsonData = pm.response.json();
    pm.environment.set("PLAYLIST_ID", jsonData.data.id);
});
```

---

#### Test 18: Get User Playlists
```
GET {{BASE_URL}}/playlists?page=1&limit=20
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Playlists fetched successfully",
  "data": [...],
  "pagination": {...},
  "statusCode": 200
}
```

---

#### Test 19: Get Playlist by ID
```
GET {{BASE_URL}}/playlists/{{PLAYLIST_ID}}
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Playlist fetched successfully",
  "data": {
    "id": "...",
    "name": "Test Playlist",
    "song_ids": [],
    "songs": []
  },
  "statusCode": 200
}
```

---

#### Test 20: Add Song to Playlist
```
POST {{BASE_URL}}/playlists/{{PLAYLIST_ID}}/songs
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "song_id": "{{SONG_ID}}"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Song added to playlist successfully",
  "data": {
    "id": "...",
    "name": "Test Playlist",
    "song_ids": ["..."]
  },
  "statusCode": 200
}
```

---

#### Test 21: Update Playlist
```
PATCH {{BASE_URL}}/playlists/{{PLAYLIST_ID}}
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "name": "Updated Playlist Name",
  "is_public": true
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Playlist updated successfully",
  "data": {
    "id": "...",
    "name": "Updated Playlist Name",
    "is_public": true
  },
  "statusCode": 200
}
```

---

#### Test 22: Remove Song from Playlist
```
DELETE {{BASE_URL}}/playlists/{{PLAYLIST_ID}}/songs/{{SONG_ID}}
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Song removed from playlist successfully",
  "data": {
    "id": "...",
    "song_ids": []
  },
  "statusCode": 200
}
```

---

#### Test 23: Delete Playlist
```
DELETE {{BASE_URL}}/playlists/{{PLAYLIST_ID}}
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Playlist deleted successfully",
  "data": null,
  "statusCode": 200
}
```

---

### **PHASE 7: Cleanup (1 test)**

#### Test 24: Delete Song
```
DELETE {{BASE_URL}}/songs/{{SONG_ID}}
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Song deleted successfully",
  "data": null,
  "statusCode": 200
}
```

---

## 📊 Test Summary

**Total Tests:** 24
- Authentication: 2
- Song Management: 4
- Streaming: 4
- Search & Discovery: 3
- Favorites: 3
- Playlists: 7
- Cleanup: 1

---

## 🎯 Running Tests in Postman

### Option 1: Manual Testing
1. Import environment variables
2. Run tests in order (1-24)
3. Check each response

### Option 2: Collection Runner
1. Create a collection with all 24 requests
2. Set pre-request scripts for auth
3. Run entire collection
4. View test results

---

## ✅ Expected Results

All tests should pass if:
- ✅ Server is running
- ✅ Supabase is configured
- ✅ R2 is configured
- ✅ Database schema is applied
- ✅ Environment variables are set

---

## 🐛 Common Issues

1. **401 Unauthorized:** Token expired or invalid
   - Solution: Re-run login test
   
2. **404 Not Found:** Wrong endpoint or ID
   - Solution: Check SONG_ID/PLAYLIST_ID variables
   
3. **500 Internal Error:** Server/DB issue
   - Solution: Check logs, verify config

---

**Happy Testing!** 🚀
