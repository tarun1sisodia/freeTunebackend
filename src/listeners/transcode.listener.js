import { Worker, QueueEvents } from "bullmq";
import getQueueConnection from "../database/connections/redisQueue.js";
import { getSupabaseAdmin } from "../database/connections/supabase.js";
import { logger } from "../utils/logger.js";
import cacheHelper from "../utils/cacheHelper.js";
import fileUploadHelper from "../services/audioUpload.js";

let uploadWorker = null;

/**
 * Initialize listener for completed upload jobs (from freeTuneYtdlp)
 * This worker listens to 'upload-queue' events or processes jobs if sharing the queue?
 * WAIT: freeTuneYtdlp has 'upload-queue' worker. We need to know when THAT finishes.
 * Actually, typical pattern:
 * 1. Backend adds to TranscodeQueue.
 * 2. Ytdlp(TranscodeWorker) picks up -> TranscodeQueue completes? No, it adds to UploadQueue.
 * 3. Ytdlp(UploadWorker) picks up -> UploadQueue completes.
 *
 * So we need to listen for COMPLETED events on 'upload-queue'.
 * Or, simpler: Ytdlp(UploadWorker) could fire a webhook or we listen to the queue events.
 * Since we share Redis, we can just attach a QueueEvents listener.
 */

export const initTranscodeListener = () => {
    const connection = getQueueConnection();
    if (!connection) {
        logger.warn("Redis not available, Transcode Listener not initialized");
        return;
    }

    // Listen to 'upload-queue' events (final step of Microservice pipeline)
    const queueEvents = new QueueEvents("upload-queue", { connection });

    queueEvents.on("completed", async ({ jobId, returnvalue }) => {
        logger.info(`Microservice Job ${jobId} completed. Result: ${JSON.stringify(returnvalue)}`);

        // Expected returnvalue from freeTuneYtdlp: { uploaded: true, keyPrefix: '...', url: '...', songId: '...' }
        // Note: We need to ensure freeTuneYtdlp passes 'songId' through all steps!
        // Current state:
        // 1. DownloadWorker receives { query, url, userId } -> produces { filePath, status, metadata }
        // 2. TranscodeWorker receives { filePath, originalId: jobId, metadata } -> produces { keyPrefix, ... }
        // 3. UploadWorker receives { ... } -> produces { uploaded: true, keyPrefix, url }

        // ISSUE: We don't have the REAL songId from the backend's perspective because the microservice doesn't create the DB entry first!
        // The ImportController just fired a job. The DB entry hasn't been created yet in the 'import' flow?
        // Wait, if we use the backend to Trigger, we technically *could* create a "Processing" entry first.

        // PLAN ADJUSTMENT:
        // Option A: Microservice creates the song in DB (requires DB access, bad for microservice isolation)
        // Option B: Backend creates "Pending" song -> passes ID -> Microservice updates it.
        // Option C: Backend receives completion -> Creates Song Entry with metadata. <-- BEST approach for now.

        try {
            if (!returnvalue || !returnvalue.url) return;

            // If returnvalue has metadata, we can create the song now!
            // We need to trust the microservice passed metadata through.
            // Let's assume for now we just log it, or update if we can find a matching pending record.

            // For this specific integration step, let's just Log and potentially notifying the user via Socket/Notification would be next step.
            // Since we don't have a "Pending Song" ID sent (ref Import Controller), we can't update a specific record yet.

            logger.info("Song processing finished. Ready to create DB entry or notify user.");

            // TODO: Implement "Create Song from Result" logic here if Microservice returns full metadata.
            // For now, this confirms the loop is closed.

        } catch (err) {
            logger.error(`Error in Transcode Listener for job ${jobId}:`, err);
        }
    });

    queueEvents.on("failed", ({ jobId, failedReason }) => {
        logger.error(`Upload job ${jobId} failed: ${failedReason}`);
    });

    logger.info("Transcode Listener (Upload Queue Events) initialized");
};
