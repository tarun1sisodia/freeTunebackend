# FreeTune API Documentation

## Base URL
```
Development: http://localhost:3000/api
Production: https://your-vercel-domain.vercel.app/api
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Success message",
  "data": {}
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": []
}
```

## Endpoints

### Health Check

#### GET /health
Check if the server is running.

**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "environment": "development",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Songs API

### GET /api/songs/stream/:id
Generate a signed URL for streaming a song.

**Auth Required:** Yes

**Parameters:**
- `id` (path): Song ID
- `quality` (query): Audio quality (high|medium|low) - default: high

**Response:**
```json
{
  "success": true,
  "data": {
    "streamUrl": "https://r2.cloudflare.com/...",
    "expiresIn": 1800,
    "quality": "high"
  }
}
```

---

### GET /api/songs/search
Search for songs.

**Auth Required:** Optional

**Query Parameters:**
- `q` (required): Search query
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Song Title",
      "artist": "Artist Name",
      "album": "Album Name",
      "duration_ms": 180000,
      "play_count": 1000
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### GET /api/songs/:id
Get song metadata.

**Auth Required:** Optional

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Song Title",
    "artist": "Artist Name",
    "album": "Album Name",
    "duration_ms": 180000,
    "play_count": 1000,
    "popularity_score": 85,
    "available_qualities": ["high", "medium", "low"]
  }
}
```

---

## User API

### POST /api/user/register
Register a new user.

**Auth Required:** No

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    },
    "token": "jwt_token_here"
  }
}
```

---

### POST /api/user/login
Login user.

**Auth Required:** No

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    },
    "token": "jwt_token_here"
  }
}
```

---

### GET /api/user/history
Get user's listening history.

**Auth Required:** Yes

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Results per page

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "song_id": "uuid",
      "title": "Song Title",
      "artist": "Artist Name",
      "played_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### POST /api/user/play
Record a song play.

**Auth Required:** Yes

**Request Body:**
```json
{
  "song_id": "uuid",
  "session_id": "session_uuid"
}
```

---

## Recommendations API

### GET /api/recommendations/generate
Get personalized recommendations.

**Auth Required:** Yes

**Query Parameters:**
- `limit` (optional): Number of recommendations (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "id": "uuid",
        "title": "Song Title",
        "artist": "Artist Name",
        "score": 0.95,
        "reason": "Based on your listening history"
      }
    ]
  }
}
```

---

### GET /api/recommendations/trending
Get trending songs.

**Auth Required:** Optional

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Song Title",
      "artist": "Artist Name",
      "trend_score": 95
    }
  ]
}
```

---

## Rate Limits

- General API: 100 requests per 15 minutes
- Authentication: 5 requests per 15 minutes
- Streaming: 30 requests per minute
- Search: 20 requests per minute

## Error Codes

- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Caching

Responses are cached using Redis with the following TTLs:
- Hot songs: 1 hour
- User recent plays: 7 days
- Trending lists: 1 hour
- CDN URLs: 30 minutes

---

**Note:** All timestamps are in ISO 8601 format (UTC).
