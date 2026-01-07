
import { Queue } from 'bullmq';
import { getQueueConnectionOptions } from '../database/connections/redisQueue.js';
import { logger } from '../utils/logger.js';

class QueueService {
    constructor() {
        this.queues = {};
        this.connectionOptions = getQueueConnectionOptions();
    }

    /**
     * Get or create a queue instance
     * @param {string} queueName 
     * @returns {Queue}
     */
    getQueue(queueName) {
        if (!this.queues[queueName]) {
            if (!this.connectionOptions) {
                logger.error(`Cannot initialize queue ${queueName}: Redis connection missing`);
                return null;
            }

            this.queues[queueName] = new Queue(queueName, {
                connection: this.connectionOptions,
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 1000,
                    },
                    removeOnComplete: {
                        age: 24 * 3600, // Keep for 24 hours
                        count: 1000,
                    },
                    removeOnFail: {
                        age: 7 * 24 * 3600, // Keep for 7 days
                    },
                },
            });
            logger.info(`Initialized queue: ${queueName}`);
        }
        return this.queues[queueName];
    }

    /**
     * Add a download job to the queue
     * @param {object} data - Job data (query, userId, etc.)
     * @returns {Promise<object>} Job info
     */
    async addDownloadJob(data) {
        const queue = this.getQueue('download-queue');
        if (!queue) throw new Error('Download queue not available');

        const jobName = `download-${Date.now()}`;
        const job = await queue.add(jobName, data);

        logger.info(`Added download job ${job.id} for query: ${data.query}`);
        return job;
    }

    /**
     * Add a transcode job (usually called by workers, but useful for manual re-runs)
     * @param {object} data 
     */
    async addTranscodeJob(data) {
        const queue = this.getQueue('transcode-queue');
        if (!queue) throw new Error('Transcode queue not available');

        return queue.add(`transcode-${Date.now()}`, data);
    }

    /**
     * Close all queues
     */
    async close() {
        const promises = Object.values(this.queues).map(q => q.close());
        await Promise.all(promises);
        this.queues = {};
    }
}

export default new QueueService();
