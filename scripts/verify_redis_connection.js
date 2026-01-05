import { Queue, QueueEvents } from 'bullmq';
import getQueueConnection from '../src/database/connections/redisQueue.js';
import { logger } from '../src/utils/logger.js';

// Mock logger if needed
if (!logger.info) {
    logger.info = console.log;
    logger.error = console.error;
    logger.warn = console.warn;
}

const runTest = async () => {
    console.log('Starting Redis Connection Sharing Test...');

    const connection = getQueueConnection();
    if (!connection) {
        console.error('Failed to get Redis connection');
        process.exit(1);
    }

    console.log('Connection obtained. Initializing QueueEvents (Subscriber)...');

    // Initialize Listener (Subscriber)
    // This might put the connection into Subscribe mode
    const queueEvents = new QueueEvents('test-queue', { connection });

    queueEvents.on('completed', ({ jobId }) => {
        console.log(`Job ${jobId} completed event received!`);
    });

    console.log('QueueEvents initialized. Initializing Queue (Publisher)...');

    // Initialize Queue (Publisher)
    const testQueue = new Queue('test-queue', { connection });

    console.log('Queue initialized. Attempting to add job...');

    try {
        await testQueue.add('test-job', { foo: 'bar' });
        console.log('✅ Job added successfully! Connection is NOT blocked for commands.');
    } catch (error) {
        console.error('❌ Failed to add job:', error.message);
        console.error('Hypothesis confirmed: Subscriber mode blocks commands.');
    }

    console.log('Cleaning up...');
    await queueEvents.close();
    await testQueue.close();
    // const redis = getQueueConnection();
    // await redis.quit(); // Don't quit if it's shared singleton without checking
    process.exit(0);
};

runTest().catch(console.error);
