/**
 * Import Controller
 * Handles importing songs from YouTube via freeTuneYtdlp microservice
 */

import { successResponse } from "../../utils/apiResponse.js";
import { HTTP_STATUS, ERROR_MESSAGES } from "../../utils/constants.js";
import ApiError from "../../utils/apiError.js";
import { logger } from "../../utils/logger.js";
import { addDownloadJob } from "../../queues/download.queue.js";

/**
 * @description Import song from YouTube (Search or URL)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const importSong = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new ApiError(
            HTTP_STATUS.UNAUTHORIZED,
            ERROR_MESSAGES.UNAUTHORIZED,
        );
    }

    const { query, url } = req.body;

    if (!query && !url) {
        throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            "Currently only YouTube URL or Search parameters are supported. Please provide 'url' or 'query'.",
        );
    }

    try {
        // Dispatch job to shared microservice
        const job = await addDownloadJob({
            query,
            url,
            userId // Pass userId so we can assign ownership later if needed
        });

        if (!job) {
            throw new ApiError(HTTP_STATUS.SERVICE_UNAVAILABLE, "Download service unavailable");
        }

        logger.info(`Import job dispatched: ${job.id} for user ${userId}`);

        return successResponse(
            res,
            {
                jobId: job.id,
                status: 'queued',
                message: "Song import started. You will be notified when it completes."
            },
            "Import started successfully",
            HTTP_STATUS.ACCEPTED,
        );

    } catch (error) {
        logger.error("Error in importSong controller:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            ERROR_MESSAGES.INTERNAL_ERROR,
        );
    }
};

export { importSong };
