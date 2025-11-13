# Songs API Endpoints Documentation

**Base URL:** `/api/v1`  
**Authentication:** Required for all endpoints (Bearer token)

---

## 🎵 Songs Endpoints

### **GET** `/songs`
Get all songs with pagination and filters
- **Query Params:**
  - `page` (optional, default: 1)
  - `limit` (optional, default: 20)
  - `artist` (optional, filter by artist)
  - `album` (optional, filter by album)
  - `sortBy` (optional, default: created_at)
  - `order` (optional, asc/desc, default: desc)
- **Response:** Paginated list of songs

### **GET** `/songs/search`
Search songs by title, artist, or album
- **Query Params:**
  - `q` (required) - search query
  - `page` (optional, default: 1)
  - `limit` (optional, default: 20)
- **Response:** Paginated search results

### **GET** `/songs/popular`
Get popular/trending songs
- **Query Params:**
  - `page` (optional, default: 1)
  - `limit` (optional, default: 20)
- **Response:** Paginated list of popular songs

### **GET** `/songs/recently-played`
Get user's recently played songs
- **Query Params:**
  - `limit` (optional, default: 20)
- **Response:** List of recently played songs

### **GET** `/songs/favorites`
Get user's favorite songs
- **Query Params:**
  - `page` (optional, default: 1)
  - `limit` (optional, default: 50)
- **Response:** Paginated list of favorite songs

### **GET** `/songs/:id`
Get single song by ID
- **Params:** `id` (UUID)
- **Response:** Song details

---

## 📤 Upload & Management Endpoints

### **POST** `/songs/upload`
Upload new song to Cloudflare R2
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `audio` (file, required) - Audio file (MP3, FLAC, WAV, AAC, OGG)
  - `title` (string, required)
  - `artist` (string, required)
  - `album` (string, optional)
  - `duration_ms` (number, required)
- **Response:** Song details + upload info

### **PATCH** `/songs/:id/metadata`
Update song metadata
- **Params:** `id` (UUID)
- **Body:**
  - `title` (string, optional)
  - `artist` (string, optional)
  - `album` (string, optional)
  - `duration_ms` (number, optional)
  - `metadata` (object, optional)
- **Response:** Updated song details

### **DELETE** `/songs/:id`
Delete song from database and R2
- **Params:** `id` (UUID)
- **Response:** Success message

---

## 🎧 Streaming Endpoints

### **GET** `/songs/:id/stream-url`
Get presigned URL for streaming (1-hour expiry)
- **Params:** `id` (UUID)
- **Query Params:**
  - `quality` (optional, default: high) - original/high/medium/low
- **Response:** Signed R2 URL + song info

### **GET** `/songs/:id/stream`
Stream song directly (redirects to R2)
- **Params:** `id` (UUID)
- **Response:** HTTP redirect to R2 URL

### **GET** `/songs/:id/file-info`
Get R2 file metadata
- **Params:** `id` (UUID)
- **Response:** File size, content type, last modified

---

## 💝 Interaction Endpoints

### **POST** `/songs/:id/favorite`
Toggle favorite (add/remove)
- **Params:** `id` (UUID)
- **Response:** `{ isFavorite: boolean }`

### **POST** `/songs/:id/play`
Track song play
- **Params:** `id` (UUID)
- **Body:**
  - `session_id` (string, optional)
  - `metadata` (object, optional)
- **Response:** Success message

### **POST** `/songs/:id/playback`
Track playback progress
- **Params:** `id` (UUID)
- **Body:**
  - `progress_ms` (number, optional)
  - `duration_ms` (number, optional)
  - `completed` (boolean, optional)
  - `session_id` (string, optional)
  - `quality` (string, optional)
  - `device_type` (string, optional)
- **Response:** Tracking confirmation

---

## 📋 Playlist Endpoints

### **GET** `/playlists`
Get user's playlists
- **Query Params:**
  - `page` (optional, default: 1)
  - `limit` (optional, default: 20)
- **Response:** Paginated list of playlists

### **POST** `/playlists`
Create new playlist
- **Body:**
  - `name` (string, required)
  - `description` (string, optional)
  - `is_public` (boolean, optional, default: false)
- **Response:** Created playlist

### **GET** `/playlists/:id`
Get single playlist with songs
- **Params:** `id` (UUID)
- **Response:** Playlist details + songs

### **PATCH** `/playlists/:id`
Update playlist details
- **Params:** `id` (UUID)
- **Body:**
  - `name` (string, optional)
  - `description` (string, optional)
  - `is_public` (boolean, optional)
- **Response:** Updated playlist

### **DELETE** `/playlists/:id`
Delete playlist
- **Params:** `id` (UUID)
- **Response:** Success message

### **POST** `/playlists/:id/songs`
Add song to playlist
- **Params:** `id` (UUID)
- **Body:**
  - `song_id` (UUID, required)
- **Response:** Updated playlist

### **DELETE** `/playlists/:id/songs/:songId`
Remove song from playlist
- **Params:** 
  - `id` (UUID) - playlist ID
  - `songId` (UUID) - song ID
- **Response:** Updated playlist

---

## 🔒 Authentication

All endpoints require authentication via Bearer token:

```
Authorization: Bearer <your_jwt_token>
```

Get token from `/api/v1/auth/login` or `/api/v1/auth/register`

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "statusCode": 200
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Data fetched successfully",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  },
  "statusCode": 200
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": ["Detail 1", "Detail 2"],
  "statusCode": 400
}
```

---

## 📝 Notes

- **File Upload Limit:** 100MB per file
- **Supported Audio Formats:** MP3, FLAC, WAV, AAC, OGG
- **Stream URL Expiry:** 1 hour (3600 seconds)
- **Rate Limiting:** Applied per auth routes (check API docs)
- **Database:** Supabase PostgreSQL
- **Storage:** Cloudflare R2 (zero egress cost)

---

**Last Updated:** 2025-11-13
