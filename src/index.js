import express from "express";
import dotenv from "dotenv";
dotenv.config();
import multer from "multer";
import fs from "fs";
import { promises as fsp } from "fs";
import path from "path";
import { pipeline } from "stream";
import { promisify } from "util";
import mime from "mime-types";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const app = express();
const PORT = process.env.PORT || 3000;
const pipe = promisify(pipeline);

// --- Setup uploads directory (local temporary store) ---
const uploadDir = path.join(__dirname, "uploads");
await fsp.mkdir(uploadDir, { recursive: true });

// --- Multer config (disk storage) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext =
      path.extname(file.originalname) ||
      `.${mime.extension(file.mimetype) || "mp3"}`;
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, safeName);
  },
});
const upload = multer({ storage });

// --- S3 (R2) client configuration ---
const s3 = new S3Client({
  region: process.env.R2_REGION || "auto",
  endpoint: process.env.R2_S3_API_URL, // e.g. https://<ACCOUNT_ID>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: false,
});

const BUCKET = process.env.R2_BUCKET_NAME;
if (!BUCKET) {
  console.warn("R2_BUCKET not set. Set it in .env");
}

// --- Health check ---
app.get("/health", (req, res) => {
  return res.json({ status: "ok", time: new Date().toISOString() });
});

// --- Upload endpoint: client -> server (temp) -> R2 ---
app.post("/upload", upload.single("song"), async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ error: "no file uploaded (field name: song)" });

    const localPath = req.file.path;
    const key = `songs/${req.file.filename}`;

    // Stream file to R2
    const fileStream = fs.createReadStream(localPath);

    const putParams = {
      Bucket: BUCKET,
      Key: key,
      Body: fileStream,
      ContentType: req.file.mimetype,
    };

    await s3.send(new PutObjectCommand(putParams));

    // Generate signed GET URL (valid 1 hour)
    const signedUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
      { expiresIn: 60 * 60 },
    );

    // Delete local temp file asynchronously (don't block response)
    fsp
      .unlink(localPath)
      .catch(err => console.warn("Failed to delete local file", err));

    return res.json({ message: "uploaded to R2", key, url: signedUrl });
  } catch (err) {
    console.error("Upload error", err);
    return res
      .status(500)
      .json({ error: "upload failed", details: err?.message || String(err) });
  }
});

// --- Stream/proxy endpoint: server fetches from R2 and pipes to client ---
app.get("/songs/:filename", async (req, res) => {
  try {
    const filename = req.params.filename; // expect just filename (not full key)
    const key = `songs/${filename}`;

    const getParams = { Bucket: BUCKET, Key: key };
    const data = await s3.send(new GetObjectCommand(getParams)); // returns Body as stream/Blob

    // Set headers if available
    if (data.ContentType) res.setHeader("Content-Type", data.ContentType);
    if (data.ContentLength) res.setHeader("Content-Length", data.ContentLength);

    // Pipe the body stream to response
    // data.Body is a stream.Readable in Node
    await pipe(data.Body, res);
  } catch (err) {
    console.error("Stream error", err);
    return res.status(404).json({
      error: "not found or failed to fetch from R2",
      details: err?.message || String(err),
    });
  }
});

// --- Optional: presign upload (server issues upload URL, client uploads directly to R2) ---
app.get("/presign-upload", async (req, res) => {
  try {
    const filename = req.query.filename || `upload-${Date.now()}.mp3`;
    const key = `songs/${filename}`;

    const putCmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      // Client must set correct Content-Type when uploading directly
    });

    const uploadUrl = await getSignedUrl(s3, putCmd, { expiresIn: 60 * 5 }); // 5 minutes
    return res.json({ uploadUrl, key });
  } catch (err) {
    console.error("Presign error", err);
    return res.status(500).json({
      error: "failed to generate presigned url",
      details: err?.message || String(err),
    });
  }
});

app.listen(PORT, () => {
  console.log(`ESM server running on http://localhost:${PORT}`);
});
