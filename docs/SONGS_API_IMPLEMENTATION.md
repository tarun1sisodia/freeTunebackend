# Songs API Implementation Guide

**Created:** 2025-11-13
**Status:** In Progress
**Purpose:** Track the implementation of Songs API (controllers → routes → testing)

---

## ✅ Prerequisites Verified

### Authentication Foundation (COMPLETE)

- ✅ `src/controllers/user/auth.controller.js` - User registration, login, logout, token refresh, password reset
- ✅ `src/controllers/user/user.controller.js` - User preferences management
- ✅ `src/services/auth.service.js` - JWT tokens, password hashing, Supabase Auth integration
- ✅ Token refresh mechanism for user inactivity handling

**Conclusion:** Authentication controllers and services are fully implemented. Ready to proceed with Songs API.

---

## 🎵 Songs API Implementation Plan

### Phase 1: Controllers (Current Phase)

**Location:** `src/controllers/songs/`

#### Required Controllers & Operations:

1. **`songs.controller.js`** - Main song operations ✅ **COMPLETE**
   - [x] `getSongs` - GET all songs (with pagination, filters)
   - [x] `getSongById` - GET single song details
   - [x] `searchSongs` - Search songs by title, artist, album
   - [x] `getRecentlyPlayed` - GET user's recently played songs
   - [x] `getFavorites` - GET user's favorite songs
   - [x] `toggleFavorite` - POST/DELETE add/remove from favorites
   - [x] `trackPlay` - POST track song play
   - [x] `getPopularSongs` - GET popular/trending songs

2. **`upload.controller.js`** - Song upload & management ✅ **COMPLETE**
   - [x] `uploadSong` - POST upload new song to R2 (multipart/form-data)
   - [x] `updateSongMetadata` - PATCH update song info
   - [x] `deleteSong` - DELETE remove song from DB and R2
   - [x] Uses existing `audioUpload.js` service for R2 operations

3. **`playlist.controller.js`** - Playlist management ✅ **COMPLETE**
   - [x] `getUserPlaylists` - GET user's playlists
   - [x] `getPlaylistById` - GET single playlist details
   - [x] `createPlaylist` - POST create new playlist
   - [x] `updatePlaylist` - PATCH update playlist details
   - [x] `deletePlaylist` - DELETE remove playlist
   - [x] `addSongToPlaylist` - POST add song to playlist
   - [x] `removeSongFromPlaylist` - DELETE remove song from playlist

4. **`stream.controller.js`** - Audio streaming ✅ **COMPLETE**
   - [x] `getStreamUrl` - GET presigned URL from R2 for streaming
   - [x] `streamSong` - GET stream audio file (redirect to R2)
   - [x] `trackPlayback` - POST record playback progress/completion
   - [x] `getFileMetadata` - GET R2 file metadata

---

### Phase 2: Services (If Needed)

**Location:** `src/services/`

- [ ] `songs.service.js` - Business logic for song operations
- [ ] `streaming.service.js` - Audio streaming logic
- [ ] Review existing `audioUpload.js` and `uploadSongs.js` services

---

### Phase 3: Routes ✅ **COMPLETE**

**Location:** `src/routes/`

- [x] `songs/index.js` - All song endpoints (15 routes)
  - Songs CRUD, search, favorites, popular
  - Upload/update/delete with R2 integration
  - Streaming URLs & playback tracking
- [x] `playlists/index.js` - All playlist endpoints (7 routes)
  - Playlist CRUD
  - Song management (add/remove)
- [x] Authentication middleware applied to all routes
- [x] Multer configured for file uploads
- [x] Routes registered in main `routes/index.js`

---

### Phase 4: Validation & Middleware

**Location:** `src/middleware/` and `src/validators/`

- [ ] Song upload validation (file type, size, metadata)
- [ ] Query parameter validation (pagination, filters)
- [ ] Authentication middleware integration
- [ ] Error handling middleware

---

### Phase 5: Testing & Documentation

- [ ] Test each endpoint with Postman/Thunder Client
- [ ] Verify database queries work correctly
- [ ] Update API documentation
- [ ] Test edge cases and error scenarios

---

## Database Schema Reference

### Existing Tables (from schema)

- `songs` - Song metadata and file references
- `user_songs` - User's uploaded songs
- `playlists` - User playlists
- `playlist_songs` - Songs in playlists
- `recently_played` - Playback history
- `favorites` - User favorite songs

---

## Implementation Notes

### Design Principles

1. **Controllers First:** Implement all controllers before routes
2. **Separation of Concerns:** Business logic in services, HTTP handling in controllers
3. **Authentication Required:** All endpoints require valid JWT token
4. **Error Handling:** Use existing `ApiError` and `asyncHandler` utilities
5. **Logging:** Use existing `logger` utility for all operations

### File Naming Convention

- Controllers: `*.controller.js`
- Services: `*.service.js`
- Routes: `*.routes.js`
- Validators: `*.validator.js`

---

## Progress Tracker

### Current Task

🎉 **Phase 3 COMPLETE - Ready for Testing!**

### Completed

- ✅ Prerequisites verification
- ✅ Implementation plan created
- ✅ **songs.controller.js** - 8 operations
- ✅ **playlist.controller.js** - 7 operations
- ✅ **upload.controller.js** - 3 operations (R2 integration)
- ✅ **stream.controller.js** - 4 operations (presigned URLs)
- ✅ **songs/index.js** - 15 REST endpoints
- ✅ **playlists/index.js** - 7 REST endpoints
- ✅ Routes registered in main router
- ✅ Multer installed for file uploads
- ✅ API documentation created

### Next Steps

1. ✅ ~~Create controllers~~ **DONE**
2. ✅ ~~Create routes~~ **DONE**
3. Start server and test endpoints
4. Optional: Add request validation schemas
5. Optional: Add rate limiting to endpoints

---

## Questions & Decisions

- **Q:** Should we use existing `audioUpload.js`services?
  - **A:** TBD - Need to review existing implementation if matches our need use it

- **Q:** Audio file storage location?
  - **A:** Cloudflare R2 bucket — store all audio files, album art, and related metadata there. Use R2’s S3-compatible SDK for uploads and access.

- **Q:** Streaming strategy?
  - **A:** Presigned URLs

---

## References

- Auth Implementation: `src/controllers/user/auth.controller.js`
- Database Schema: Check Supabase dashboard
- Existing Services: `src/services/audioUpload.js`, `src/services/uploadSongs.js`

---

**Last Updated:** 2025-11-13
