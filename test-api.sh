#!/bin/bash

BASE_URL="http://localhost:3000/api/v1"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Testing FreeTune API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Login
echo "1️⃣  Testing Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tarun1sisodia@gmail.com",
    "password": "T@run12345"
  }')

echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
echo ""

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token // .token // empty' 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed or token not found"
  exit 1
fi

echo "✅ Login successful!"
echo "Token: ${TOKEN:0:50}..."
echo ""

# 2. Get all songs
echo "2️⃣  Fetching all songs..."
SONGS_RESPONSE=$(curl -s -X GET "$BASE_URL/songs" \
  -H "Authorization: Bearer $TOKEN")

echo "$SONGS_RESPONSE" | jq '.' 2>/dev/null || echo "$SONGS_RESPONSE"
echo ""

# 3. Count songs
SONG_COUNT=$(echo "$SONGS_RESPONSE" | jq '.data | length' 2>/dev/null)
echo "📊 Songs returned: $SONG_COUNT"
echo ""

# 4. Get popular songs
echo "3️⃣  Fetching popular songs..."
POPULAR_RESPONSE=$(curl -s -X GET "$BASE_URL/songs/popular" \
  -H "Authorization: Bearer $TOKEN")

echo "$POPULAR_RESPONSE" | jq '.data | length' 2>/dev/null || echo "0"
echo ""

# 5. Database check
echo "4️⃣  Database verification..."
node debug-database.js 2>&1 | grep -A5 "Total songs"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Test complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
