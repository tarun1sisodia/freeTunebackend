import { Queue } from "bullmq";
import getQueueConnection from "../database/connections/redisQueue.js";
import { logger } from "../utils/logger.js";

let downloadQueue = null;

export const getDownloadQueue = () => {
    if (!downloadQueue) {
        const connection = getQueueConnection();
        if (connection) {
            downloadQueue = new Queue("download-queue", {
                connection,
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: "exponential",
                        delay: 1000,
                    },
                    removeOnComplete: true,
                    removeOnFail: false,
                },
            });
            logger.info("Download Queue initialized (Shared with freeTuneYtdlp)");
        } else {
            logger.warn("Redis not available, Download Queue not initialized");
        }
    }
    return downloadQueue;
};

export const addDownloadJob = async (data) => {
    const queue = getDownloadQueue();
    if (queue) {
        return queue.add("download-audio", data);
    }
    return null;
};
