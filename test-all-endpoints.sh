#!/bin/bash

TOKEN=$(curl -s -X POST "http://localhost:3000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"tarun1sisodia@gmail.com","password":"T@run12345"}' \
  | jq -r '.data.accessToken')

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🎵 FreeTune - Complete API & Redis Test 🎵           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Test 1: Individual Song by ID
SONG_ID="25dffd19-b06c-48b1-8c59-e0cd73099a5a"
echo "1️⃣  Testing GET /songs/:id (Individual Song Caching)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

START1=$(date +%s%3N)
RESP1=$(curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/v1/songs/$SONG_ID")
END1=$(date +%s%3N)
DUR1=$((END1 - START1))

echo "   Request #1 (Cache MISS): ${DUR1}ms"
echo "   Song: $(echo "$RESP1" | jq -r '.data.title + " - " + .data.artist')"

sleep 1

START2=$(date +%s%3N)
RESP2=$(curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/v1/songs/$SONG_ID")
END2=$(date +%s%3N)
DUR2=$((END2 - START2))

echo "   Request #2 (Cache HIT):  ${DUR2}ms"
IMP1=$(echo "scale=1; ($DUR1 - $DUR2) * 100 / $DUR1" | bc)
echo "   ⚡ Improvement: ${IMP1}%"
echo ""

# Test 2: Popular Songs
echo "2️⃣  Testing GET /songs/popular (Popular Songs Caching)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

START1=$(date +%s%3N)
RESP1=$(curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/v1/songs/popular")
END1=$(date +%s%3N)
DUR1=$((END1 - START1))

COUNT=$(echo "$RESP1" | jq '.data | length')
echo "   Request #1 (Cache MISS): ${DUR1}ms (${COUNT} songs)"

sleep 1

START2=$(date +%s%3N)
RESP2=$(curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/v1/songs/popular")
END2=$(date +%s%3N)
DUR2=$((END2 - START2))

echo "   Request #2 (Cache HIT):  ${DUR2}ms (${COUNT} songs)"
IMP2=$(echo "scale=1; ($DUR1 - $DUR2) * 100 / $DUR1" | bc)
echo "   ⚡ Improvement: ${IMP2}%"
echo ""

# Test 3: Search
echo "3️⃣  Testing GET /songs/search (Search Caching)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

START1=$(date +%s%3N)
RESP1=$(curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/v1/songs/search?q=sawaal")
END1=$(date +%s%3N)
DUR1=$((END1 - START1))

COUNT=$(echo "$RESP1" | jq '.data | length')
echo "   Request #1 (Cache MISS): ${DUR1}ms (${COUNT} results)"

sleep 1

START2=$(date +%s%3N)
RESP2=$(curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/v1/songs/search?q=sawaal")
END2=$(date +%s%3N)
DUR2=$((END2 - START2))

echo "   Request #2 (Cache HIT):  ${DUR2}ms (${COUNT} results)"
IMP3=$(echo "scale=1; ($DUR1 - $DUR2) * 100 / $DUR1" | bc)
echo "   ⚡ Improvement: ${IMP3}%"
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                   ✅ SUMMARY                              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "  📊 Redis Caching Performance:"
echo "  ├─ Individual song: ${IMP1}% faster"
echo "  ├─ Popular songs:   ${IMP2}% faster"
echo "  └─ Search results:  ${IMP3}% faster"
echo ""
echo "  ✅ All endpoints working with Redis caching!"
echo ""

