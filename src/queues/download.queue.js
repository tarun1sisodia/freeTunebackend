import { Queue } from "bullmq";
import getQueueConnection from "../database/connections/redisQueue.js";
import { logger } from "../utils/logger.js";

let downloadQueue = null;

const getDownloadQueue = () => {
    if (downloadQueue) return downloadQueue;

    const connection = getQueueConnection();
    if (!connection) {
        logger.warn("Redis connection not available, Download Queue disabled");
        return null;
    }

    downloadQueue = new Queue("download-queue", {
        connection,
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 1000,
            },
            removeOnComplete: true, // Keep Redis clean
            removeOnFail: { count: 100 }, // Keep last 100 failed jobs
        },
        opts: {
            metrics: {
                maxDataPoints: 0, // Disable metrics
            },
        },
    });

    return downloadQueue;
};

/**
 * Add a job to the download queue
 * @param {object} data - Job data { query, url, songId, ... }
 */
export const triggerDownload = async (data) => {
    const queue = getDownloadQueue();
    if (!queue) return false;

    try {
        await queue.add("download-audio", data);
        logger.info(`Triggered download job for: ${data.query || data.url}`);
        return true;
    } catch (error) {
        logger.error("Failed to add job to download queue:", error);
        return false;
    }
};

// Export alias for compatibility with import.controller.js
export const addDownloadJob = triggerDownload;
