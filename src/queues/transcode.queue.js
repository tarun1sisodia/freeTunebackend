import { Queue } from "bullmq";
import { getRedisClient } from "../database/connections/redis.js";
import { logger } from "../utils/logger.js";

let transcodeQueue = null;

export const getTranscodeQueue = () => {
    if (!transcodeQueue) {
        const connection = getRedisClient();
        if (connection) {
            transcodeQueue = new Queue("transcode-queue", {
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
            logger.info("Transcode Queue initialized");
        } else {
            logger.warn("Redis not available, Transcode Queue not initialized");
        }
    }
    return transcodeQueue;
};

export const addTranscodeJob = async (data) => {
    const queue = getTranscodeQueue();
    if (queue) {
        return queue.add("transcode", data);
    }
    return null;
};
