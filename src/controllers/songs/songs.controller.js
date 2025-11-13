import { successResponse } from "../../utils/apiResponse.js";
import { HTTP_STATUS } from "../../utils/constants.js";

/**
 * @description Get a list of songs
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getSongs = (req, res) => {
  // TODO: Implement logic to fetch songs from the database
  return successResponse(res, [], "Songs fetched successfully", HTTP_STATUS.OK);
};

/**
 * @description Get a song by ID
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getSongById = (req, res) => {
  // TODO: Implement logic to fetch a song by ID from the database
  const { id } = req.params;
  return successResponse(
    res,
    { id },
    `Song with id ${id} fetched successfully`,
    HTTP_STATUS.OK,
  );
};

export { getSongs, getSongById };
