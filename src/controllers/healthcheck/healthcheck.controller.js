import { successResponse } from "../../utils/apiResponse.js";
import { HTTP_STATUS } from "../../utils/constants.js";

/**
 * @description Health check controller
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getHealthCheck = (req, res) => {
  const healthcheck = {
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
  return successResponse(res, healthcheck, "API is healthy", HTTP_STATUS.OK);
};

export { getHealthCheck };
