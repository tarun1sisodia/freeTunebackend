import IORedis from "ioredis";
import config from "../../config/index.js";
import { logger } from "../../utils/logger.js";

let queueConnection = null;

const getQueueConnection = () => {
    if (!queueConnection) {
        if (!config.redis.url) {
            logger.warn("Redis URL not configured, Queue connection disabled");
            return null;
        }

        try {
            const url = new URL(config.redis.url);
            const connectionOptions = {
                host: url.hostname,
                port: parseInt(url.port) || 6379,
                password: config.redis.token, // Upstash token doubles as password
                maxRetriesPerRequest: null, // Required by BullMQ
                enableReadyCheck: false,
            };

            // Enable TLS if using HTTPS URL (Upstash)
            if (config.redis.url.startsWith('https')) {
                connectionOptions.tls = {
                    servername: url.hostname
                };
            }

            queueConnection = new IORedis(connectionOptions);

            queueConnection.on('error', (err) => {
                logger.error('Redis Queue Connection Error:', err);
            });

            queueConnection.on('connect', () => {
                logger.info('Redis Queue Connection Established (IORedis)');
            });

        } catch (error) {
            logger.error("Failed to initialize Redis Queue connection:", error);
            return null;
        }
    }
    return queueConnection;
};

// Export options so listeners can create their own connections (Subscriber mode)
export const getQueueConnectionOptions = () => {
    if (!config.redis.url) return null;
    const url = new URL(config.redis.url);
    const options = {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        password: config.redis.token,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
    };
    if (config.redis.url.startsWith('https')) {
        options.tls = { servername: url.hostname };
    }
    return options;
};

export default getQueueConnection;
