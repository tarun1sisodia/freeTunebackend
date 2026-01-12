import { Worker, QueueEvents } from "bullmq";
import getQueueConnection, { getQueueConnectionOptions } from "../database/connections/redisQueue.js";
import { getSupabaseAdmin } from "../database/connections/supabase.js";
import { logger } from "../utils/logger.js";
import cacheHelper from "../utils/cacheHelper.js";
import fileUploadHelper from "../services/audioUpload.js";
import { CACHE_KEYS } from "../utils/constants.js";

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
    const connectionOptions = getQueueConnectionOptions();
    if (!connectionOptions) {
        logger.warn("Redis not available, Transcode Listener not initialized");
        return;
    }

    // Listen to 'upload-queue' events
    // MUST use a new connection for events (Subscriber mode blocks the connection)
    const queueEvents = new QueueEvents("upload-queue", { connection: connectionOptions });

    queueEvents.on("completed", async ({ jobId, returnvalue }) => {
        logger.info(`Microservice Job ${jobId} completed. Result: ${JSON.stringify(returnvalue)}`);

        try {
            if (!returnvalue || !returnvalue.url) return;

            const { url, keyPrefix, originalId, metadata } = returnvalue;

            // Validate essential metadata
            // If we have a songId (update mode), we can proceed even if metadata is partial
            // If no songId (create mode), we strictly need title
            const isUpdate = !!(returnvalue.songId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(returnvalue.songId));

            if (!isUpdate && (!metadata || !metadata.title)) {
                logger.warn(`Job ${jobId} completed but missing metadata and no songId. Skipping DB creation.`);
                return;
            }

            logger.info(`Creating DB entry for song: ${metadata.title}`);

            const supabase = getSupabaseAdmin();

            // Prepare song data
            const songData = {
                title: metadata.title,
                artist: metadata.artist || metadata.uploader || "Unknown Artist",
                album: metadata.album || "Unknown Album",
                album_art_url: returnvalue.thumbnailUrl || metadata.thumbnail || null,
                duration_ms: Math.floor((metadata.duration || 0) * 1000),
                hls_url: url,
                r2_key: keyPrefix,
                metadata: metadata,
                download_url: returnvalue.originalMp3Url || null, // Map MP3 URL to download_url
                updated_at: new Date().toISOString()
            };

            let data, error;
            let action = "created";

            // If we have a valid UUID as songId, try to UPDATE
            if (returnvalue.songId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(returnvalue.songId)) {
                logger.info(`Restoration detected. Updating existing song ID: ${returnvalue.songId}`);

                const { data: updated, error: updateError } = await supabase
                    .from("songs")
                    .update(songData)
                    .eq("id", returnvalue.songId)
                    .select()
                    .maybeSingle();

                if (!updateError && updated) {
                    data = updated;
                    action = "restored";
                } else {
                    const failReason = updateError ? updateError.message : "ID not found";
                    // Downgrade to info as this is expected for new songs
                    logger.info(`Song ID ${returnvalue.songId} not passed or not found in DB, falling back to create new entry: ${failReason}`);
                }
            }

            // Fallback: Create NEW song if update failed or no ID provided
            if (!data) {
                // If we attempted an update but failed, mark this as a fallback creation
                if (action === "created" && returnvalue.songId) {
                    action = "created (fallback - ID not found)";
                } else {
                    action = "created (new)";
                }

                const { data: inserted, error: insertError } = await supabase
                    .from("songs")
                    .insert({
                        ...songData,
                        created_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                data = inserted;
                error = insertError;
            }

            if (error) {
                logger.error(`Failed to save song to DB: ${error.message}`);
            } else {
                logger.info(`✅ Song ${action} successfully in DB: ${data.title} (ID: ${data.id})`);
                // Targeted Cache Invalidation
                // We avoid wildcard deletions to save costs/ops.
                // We only invalidate the first pages of lists where this new song might appear immediately.
                await cacheHelper.delMany([
                    "songs:page:1:limit:20", // Assuming default pagination
                    "songs:page:1:limit:50",
                    "popular:songs:page:1:limit:20",
                    "popular:songs:page:1:limit:50"
                ]);

                // If it was a restoration/update
                if (action === "restored" || action === "updated") {
                    await cacheHelper.del(`song:${data.id}`);
                    await cacheHelper.del(CACHE_KEYS.CDN_URL(data.id, "high"));
                    await cacheHelper.del(CACHE_KEYS.CDN_URL(data.id, "medium"));
                    await cacheHelper.del(CACHE_KEYS.CDN_URL(data.id, "low"));
                }
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
