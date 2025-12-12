import { Worker } from "bullmq";
import { getRedisClient } from "../database/connections/redis.js";
import { getSupabaseAdmin } from "../database/connections/supabase.js";
import { logger } from "../utils/logger.js";
import cacheHelper from "../utils/cacheHelper.js";

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
import { QueueEvents } from "bullmq";

export const initTranscodeListener = () => {
    const connection = getRedisClient();
    if (!connection) {
        logger.warn("Redis not available, Transcode Listener not initialized");
        return;
    }

    const queueEvents = new QueueEvents("upload-queue", { connection });

    queueEvents.on("completed", async ({ jobId, returnvalue }) => {
        logger.info(`Upload job ${jobId} completed. Result: ${JSON.stringify(returnvalue)}`);

        // returnvalue format from Ytdlp: { uploaded: true, keyPrefix: '...', url: '...' }
        // We need to know WHICH song it was.
        // The jobId in upload-queue might not be the songId.
        // However, Ytdlp's upload worker currently returns: { uploaded: true, keyPrefix, url }
        // We need it to return metadata or we need to look up the job.

        try {
            if (!returnvalue || !returnvalue.url) return;

            // Extract songId from keyPrefix "songs/{id}"
            // or ensure we pass it through.
            // The returnvalue.keyPrefix is "songs/{originalId}"
            const parts = returnvalue.keyPrefix.split('/');
            const songId = parts[1]; // assuming songs/123

            if (!songId) {
                logger.warn(`Could not extract songId from keyPrefix: ${returnvalue.keyPrefix}`);
                return;
            }

            const supabase = getSupabaseAdmin();
            const { error } = await supabase
                .from('songs')
                .update({ hls_url: returnvalue.url })
                .eq('id', songId);

            if (error) {
                logger.error(`Failed to update HLS URL for song ${songId}:`, error);
            } else {
                logger.info(`Updated HLS URL for song ${songId}`);
                // Invalidate cache again so HLS URL appears
                await cacheHelper.del(`song:${songId}`);
            }

        } catch (err) {
            logger.error(`Error in Transcode Listener for job ${jobId}:`, err);
        }
    });

    queueEvents.on("failed", ({ jobId, failedReason }) => {
        logger.error(`Upload job ${jobId} failed: ${failedReason}`);
    });

    logger.info("Transcode Listener (Upload Queue Events) initialized");
};
