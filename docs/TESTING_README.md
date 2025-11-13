# 🧪 Testing Your Songs API

## 📦 What You Have

1. **POSTMAN_TESTING_GUIDE.md** - Detailed step-by-step guide with 24 tests
2. **FreeTune_Postman_Collection.json** - Ready-to-import Postman collection

---

## 🚀 Quick Start

### 1. Start Your Server
```bash
npm start
```

### 2. Import Postman Collection

**Method A: Import JSON File**
1. Open Postman
2. Click "Import" button (top left)
3. Select `FreeTune_Postman_Collection.json`
4. Click "Import"

**Method B: Manual Setup**
Follow the guide in `POSTMAN_TESTING_GUIDE.md`

### 3. Configure Variables

In Postman, edit collection variables:
- `BASE_URL` = `http://localhost:3000/api/v1` (or your port)
- `USER_EMAIL` = Your test email
- `USER_PASSWORD` = Your test password

### 4. Run Tests in Order

**Option 1: Run All Tests**
1. Click on collection name
2. Click "Run" button
3. Select all requests
4. Click "Run FreeTune Songs API"

**Option 2: Run Manually**
Execute requests in this order:
1. Authentication (2 tests)
2. Song Management (4 tests)
3. Streaming (4 tests)
4. Search & Discovery (3 tests)
5. Favorites (3 tests)
6. Playlists (7 tests)
7. Cleanup (1 test)

---

## 📋 Test Checklist

### Before Testing
- [ ] Server running (`npm start`)
- [ ] Supabase configured (check `.env`)
- [ ] R2 configured (check `.env`)
- [ ] Database schema applied (001_initial_schema.sql)
- [ ] Postman collection imported

### Test Results
- [ ] 1.1 Register User - ✅/❌
- [ ] 1.2 Login User - ✅/❌
- [ ] 2.1 Upload Song - ✅/❌
- [ ] 2.2 Get All Songs - ✅/❌
- [ ] 2.3 Get Song by ID - ✅/❌
- [ ] 2.4 Update Metadata - ✅/❌
- [ ] 3.1 Get Stream URL - ✅/❌
- [ ] 3.2 Track Play - ✅/❌
- [ ] 3.3 Track Playback - ✅/❌
- [ ] 3.4 Get File Info - ✅/❌
- [ ] 4.1 Search Songs - ✅/❌
- [ ] 4.2 Get Popular - ✅/❌
- [ ] 4.3 Get Recently Played - ✅/❌
- [ ] 5.1 Add to Favorites - ✅/❌
- [ ] 5.2 Get Favorites - ✅/❌
- [ ] 5.3 Remove Favorite - ✅/❌
- [ ] 6.1 Create Playlist - ✅/❌
- [ ] 6.2 Get Playlists - ✅/❌
- [ ] 6.3 Get Playlist by ID - ✅/❌
- [ ] 6.4 Add Song to Playlist - ✅/❌
- [ ] 6.5 Update Playlist - ✅/❌
- [ ] 6.6 Remove Song - ✅/❌
- [ ] 6.7 Delete Playlist - ✅/❌
- [ ] 7.1 Delete Song - ✅/❌

---

## 🎯 Expected Results

**All tests should pass (✅) if:**
- Server is running correctly
- All environment variables are set
- Database schema is applied
- R2 bucket is accessible

---

## 🐛 Troubleshooting

### Common Issues

**401 Unauthorized**
- Token expired or missing
- Solution: Re-run "1.2 Login User"

**404 Not Found**
- Wrong endpoint URL
- Solution: Check BASE_URL variable

**500 Internal Server Error**
- Server/database issue
- Solution: Check server logs

**File Upload Fails**
- File too large (>100MB)
- Wrong format
- Solution: Use MP3/FLAC/WAV < 100MB

---

## 📊 Test Coverage

**Total Tests:** 24
**Endpoints Covered:** 22
**Test Success Rate:** Should be 100%

### Coverage Breakdown
- ✅ Authentication (2 tests)
- ✅ Upload & Management (4 tests)
- ✅ Streaming (4 tests)
- ✅ Search & Discovery (3 tests)
- ✅ Favorites (3 tests)
- ✅ Playlists (7 tests)
- ✅ Cleanup (1 test)

---

## 📝 Notes

- Tests use collection variables for IDs
- Each test has assertions
- Tests should run in order
- Some tests depend on previous results
- Upload test requires an audio file

---

## 🎉 After Testing

Once all tests pass:
1. ✅ API is working correctly
2. ✅ Ready for frontend integration
3. ✅ Ready for deployment
4. ✅ Can start building UI

---

**Happy Testing!** 🚀

Need help? Check `POSTMAN_TESTING_GUIDE.md` for detailed instructions.
