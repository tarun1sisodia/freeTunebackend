# Music Streaming Architecture: The "On-Demand" & "Pre-Uploaded" Hybrid

This guide breaks down the architecture for a music app that supports two methods of ingestion:
1.  **Standard Upload**: Admin/Artist uploads files directly.
2.  **On-Demand (Your Unique Flow)**: User searches -> System checks Redis/Cloudflare -> If missing, it fetches via `yt-dlp`.

---

## 1. The Core "On-Demand" Algorithm (Your Idea)

This is the most critical part of your system. Here is the exact flow for your **Search & Fetch Service**.

### The Flowchart
1.  **User Search**: User types "Song Name" in the app.
2.  **Step 1: The Redis Check (Fast Layer)**
    *   **Logic**: Check Redis for a key like `song:map:{search_term}`.
    *   **Hit**: Redis returns `{"status": "ready", "url": "https://cdn.../song.m3u8"}`. -> **Play Song**.
    *   **Miss**: Song is not in Redis. -> **Go to Step 2**.
3.  **Step 2: The Cloudflare Check (Storage Layer)**
    *   *Why?* Maybe Redis was cleared, but the file exists in storage.
    *   **Logic**: Check your Database or Cloudflare bucket for the file.
    *   **Hit**: Update Redis with the found data. -> **Play Song**.
    *   **Miss**: Song effectively doesn't exist. -> **Go to Step 3**.
4.  **Step 3: The "Fetcher" Service (yt-dlp)**
    *   **Action**: Trigger a background job (Worker).
    *   **User Feedback**: Send a "Processing/Loading" state to the user.

### The "Fetcher" Service Logic (How to make it)
This is a separate backend service (Python/Node.js) that runs `yt-dlp`.

**Algorithm:**
1.  **Search YouTube**: Use `yt-dlp` to search for the video ID.
    *   `yt-dlp "ytsearch1:Song Name" --print id`
2.  **Download & Pipe**: Don't download the whole file to disk if you can avoid it. Pipe the audio stream directly into FFmpeg.
    *   `yt-dlp -o - [VIDEO_ID] | ffmpeg -i pipe:0 ...`
3.  **Transcode & Segment**:
    *   Convert to **HLS (.m3u8)** format with multiple qualities (Low, Mid, High).
    *   Split into **chunks** (segments) of 6-10 seconds.
4.  **Upload to Cloudflare**:
    *   As chunks are created, upload them to Cloudflare R2 immediately.
5.  **Update Systems**:
    *   **Save to DB**: Store metadata (Title, Duration, Cloudflare URL).
    *   **Save to Redis**: `SET song:map:{search_term} -> {url: ...}`.
6.  **Notify User**: Push a notification via WebSocket/SSE: "Song is ready to play."

---

## 2. Audio Quality & Adaptive Bitrate (ABR)

You asked: *"How do we decide quality and how does it change automatically?"*

### How we "Decide" Quality
We don't "decide" one quality. We create **ALL** of them.
When `yt-dlp` gets the audio (usually Opus/AAC at 160kbps), we use **FFmpeg** to transcode it into a "Ladder":

| Quality Name | Bitrate | Bandwidth Required | Use Case |
| :--- | :--- | :--- | :--- |
| **Low** | 64 kbps | 3G / Slow Data | User is in a tunnel or rural area. |
| **Medium** | 128 kbps | 4G / LTE | Standard listening (Spotify default). |
| **High** | 256+ kbps | Wi-Fi / 5G | High fidelity. |

### How it Changes "Automatically"
This is handled by the **HLS Protocol**, not your server code.
1.  **The Manifest**: You generate a master `.m3u8` file that lists the URLs for Low, Medium, and High streams.
2.  **The Player**: The video/audio player on the phone (ExoPlayer for Android, AVPlayer for iOS) downloads this manifest.
3.  **The Logic**:
    *   The player detects bandwidth is 500kbps.
    *   It sees "High" needs 300kbps. It chooses **High**.
    *   Suddenly bandwidth drops to 100kbps.
    *   The player automatically requests the next chunk from the **Low** list.

---

## 3. Redis: How & Why?

You asked: *"How will music be stored there and what conditions match?"*

**Music is NEVER stored in Redis.** Redis is for text/metadata only. Audio files are too big and expensive for RAM.

### What IS stored in Redis?
1.  **The "Map"**:
    *   **Key**: `song:search:arijit_singh_tum_hi_ho`
    *   **Value**: `{"cf_url": "https://r2.cloudflarestorage.com/songs/123/master.m3u8", "status": "ready"}`
    *   *Condition*: Used every time a user searches.

2.  **The "Lock" (Concurrency Control)**:
    *   *Problem*: User A searches "Song X". Service starts downloading. User B searches "Song X" 2 seconds later. You don't want to download it twice.
    *   *Solution*:
        *   Check Redis for `lock:download:Song X`.
        *   **If exists**: User B waits for User A's job.
        *   **If not**: Create lock, start download.

---

## 4. Authentication (Who can listen?)

You asked: *"How we authenticate user while streaming?"*

Since your files are on Cloudflare, you can't just use a simple database check for every single chunk (too slow).

**The Solution: Signed URLs**
1.  **Login**: User logs in -> App gets a generic `auth_token`.
2.  **Request Song**: App sends `GET /api/song/123` with `auth_token`.
3.  **Server Check**: Server checks if user has a valid subscription.
4.  **Sign the URL**:
    *   Server takes the Cloudflare URL: `https://cdn.com/song.m3u8`
    *   Server adds a cryptographic signature and expiry: `?token=hmac_signature_abc123&expires=1715000000`
5.  **Stream**: App tries to play this long URL.
6.  **Cloudflare Check**: Cloudflare verifies the signature. If valid, it serves the file. If the user copies the link and sends it to a friend 1 hour later, it fails (expired).

---

## 5. What to EXCLUDE (What NOT to do)

As a beginner, avoid these common traps:

1.  **Don't store Audio in Database/Redis**:
    *   *Bad*: Storing binary MP3 data in MySQL or Redis.
    *   *Good*: Store **paths/URLs** in DB, files in Cloudflare R2.
2.  **Don't Stream from your API Server**:
    *   *Bad*: `GET /api/stream?song=1` -> Node.js reads file -> pipes to user. (Your server will crash with 100 users).
    *   *Good*: Generate a Cloudflare link and let Cloudflare handle the traffic.
3.  **Don't Transcode on the Main Server**:
    *   *Bad*: Running FFmpeg on the same server that handles API requests. (FFmpeg uses 100% CPU).
    *   *Good*: Use a separate "Worker" server or queue for processing.
