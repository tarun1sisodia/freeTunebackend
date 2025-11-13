import { successResponse } from "../../utils/apiResponse.js";
import { HTTP_STATUS } from "../../utils/constants.js";

/**
 * @description Get a list of users
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getUsers = (req, res) => {
  // TODO: Implement logic to fetch users from the database
  return successResponse(res, [], "Users fetched successfully", HTTP_STATUS.OK);
};

/**
 * @description Get a user by ID
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getUserById = (req, res) => {
  // TODO: Implement logic to fetch a user by ID from the database
  const { id } = req.params;
  return successResponse(
    res,
    { id },
    `User with id ${id} fetched successfully`,
    HTTP_STATUS.OK,
  );
};

export { getUsers, getUserById };
