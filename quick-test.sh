#!/bin/bash

echo "🔐 Logging in..."
TOKEN=$(curl -s -X POST "http://localhost:3000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"tarun1sisodia@gmail.com","password":"T@run12345"}' \
  | jq -r '.data.accessToken')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Login successful"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎵 Testing GET /songs (First Request - Cache MISS)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
START1=$(date +%s%3N)
RESPONSE1=$(curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/v1/songs")
END1=$(date +%s%3N)
DURATION1=$((END1 - START1))

echo "$RESPONSE1" | jq '{success, count: (.data | length), pagination: .pagination}'
echo "⏱️  Duration: ${DURATION1}ms"
echo ""

sleep 1

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎵 Testing GET /songs (Second Request - Cache HIT)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
START2=$(date +%s%3N)
RESPONSE2=$(curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/v1/songs")
END2=$(date +%s%3N)
DURATION2=$((END2 - START2))

echo "$RESPONSE2" | jq '{success, count: (.data | length), pagination: .pagination}'
echo "⏱️  Duration: ${DURATION2}ms"
echo ""

IMPROVEMENT=$(echo "scale=1; ($DURATION1 - $DURATION2) * 100 / $DURATION1" | bc)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Performance Analysis"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "First request (DB):     ${DURATION1}ms"
echo "Second request (cache): ${DURATION2}ms"
echo "Speed improvement:      ${IMPROVEMENT}%"
echo ""

if [ $DURATION2 -lt $DURATION1 ]; then
  echo "✅ Redis caching is WORKING!"
else
  echo "⚠️  Second request not faster"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎵 Sample Song Data:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$RESPONSE2" | jq '.data[0] | {id, title, artist, album, durationMs}'
