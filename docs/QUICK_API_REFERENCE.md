# 🚀 Songs API - Quick Reference

**Base:** `/api/v1` | **Auth:** Bearer Token Required

---

## 📍 Endpoints Summary

### Songs (15)
```
GET    /songs                      List all songs
GET    /songs/search               Search songs
GET    /songs/popular              Popular songs
GET    /songs/recently-played      User history
GET    /songs/favorites            User favorites
GET    /songs/:id                  Song details
POST   /songs/upload               Upload song (R2)
PATCH  /songs/:id/metadata         Update metadata
DELETE /songs/:id                  Delete song
GET    /songs/:id/stream-url       Get stream URL
GET    /songs/:id/stream           Stream directly
GET    /songs/:id/file-info        File metadata
POST   /songs/:id/favorite         Toggle favorite
POST   /songs/:id/play             Track play
POST   /songs/:id/playback         Track progress
```

### Playlists (7)
```
GET    /playlists                  List playlists
POST   /playlists                  Create playlist
GET    /playlists/:id              Playlist details
PATCH  /playlists/:id              Update playlist
DELETE /playlists/:id              Delete playlist
POST   /playlists/:id/songs        Add song
DELETE /playlists/:id/songs/:songId Remove song
```

---

## 🔑 Quick Test Commands

### 1. Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

### 2. Upload Song
```bash
curl -X POST http://localhost:3000/api/v1/songs/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "audio=@song.mp3" \
  -F "title=Song Title" \
  -F "artist=Artist Name" \
  -F "duration_ms=240000"
```

### 3. Get Songs
```bash
curl http://localhost:3000/api/v1/songs?page=1&limit=20 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Search Songs
```bash
curl http://localhost:3000/api/v1/songs/search?q=rock \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Get Stream URL
```bash
curl http://localhost:3000/api/v1/songs/SONG_ID/stream-url?quality=high \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6. Create Playlist
```bash
curl -X POST http://localhost:3000/api/v1/playlists \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Playlist","is_public":false}'
```

### 7. Add Song to Playlist
```bash
curl -X POST http://localhost:3000/api/v1/playlists/PLAYLIST_ID/songs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"song_id":"SONG_ID"}'
```

---

## 📊 Response Format

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "statusCode": 200
}
```

---

## 🛠️ Tech Stack
- **Database:** Supabase PostgreSQL
- **Storage:** Cloudflare R2
- **Auth:** JWT (Supabase)
- **Upload:** Multer
- **Streaming:** Presigned URLs (1hr)

---

**For full documentation:** See `docs/SONGS_API_ENDPOINTS.md`
