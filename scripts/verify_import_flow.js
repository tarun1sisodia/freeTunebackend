import { Queue, QueueEvents } from 'bullmq';
import { getQueueConnectionOptions } from '../src/database/connections/redisQueue.js';
import getQueueConnection from '../src/database/connections/redisQueue.js';
import { logger } from '../src/utils/logger.js';

// Mock logger
if (!logger.info) {
    logger.info = console.log;
    logger.error = console.error;
    logger.warn = console.warn;
}

const runTest = async () => {
    console.log('🚀 Starting Import Flow Verification...');

    // 1. Setup Connections
    const publisherConnection = getQueueConnection();
    const subscriberOptions = getQueueConnectionOptions();

    if (!publisherConnection || !subscriberOptions) {
        console.error('❌ Redis configuration missing');
        process.exit(1);
    }

    // 2. Setup Queues and Listeners
    const downloadQueue = new Queue('download-queue', { connection: publisherConnection });
    const downloadEvents = new QueueEvents('download-queue', { connection: subscriberOptions });

    console.log('✅ Queues and Listeners initialized with SEPARATE connections.');

    // 3. Listen for events
    downloadEvents.on('waiting', ({ jobId }) => {
        console.log(`[Queue] Job ${jobId} is waiting to be processed`);
    });

    downloadEvents.on('active', ({ jobId }) => {
        console.log(`[Queue] Job ${jobId} is ACTIVE (Worker picked it up)`);
    });

    downloadEvents.on('completed', ({ jobId, returnvalue }) => {
        console.log(`[Queue] Job ${jobId} COMPLETED! Return value:`, returnvalue);
        process.exit(0);
    });

    downloadEvents.on('failed', ({ jobId, failedReason }) => {
        console.error(`[Queue] Job ${jobId} FAILED: ${failedReason}`);
        process.exit(1);
    });

    // 4. Add Job
    console.log('➕ Adding test download job...');
    const job = await downloadQueue.add('verify-flow', {
        query: 'test song query',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' // Rick Roll for testing
    });

    console.log(`✅ Job ${job.id} added. Waiting for worker...`);
    console.log('(Note: If no worker is running, this script will hang at "waiting")');

    // Timeout after 10 seconds if no worker
    setTimeout(() => {
        console.log('⚠️  Timeout: No worker processed the job in 10s.');
        console.log('ℹ️  This confirms the QUEUE accepts jobs, but the Worker is not running or not picking it up.');
        console.log('ℹ️  This is expected if the microservice is not running.');
        process.exit(0);
    }, 10000);
};

runTest().catch((err) => {
    console.error(err);
    process.exit(1);
});
