import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getUsers, getUserById } from "../../controllers/user/user.controller.js";

const router = Router();

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get a list of users
 *     description: Responds with a list of users.
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: A list of users.
 */
router.route("/").get(asyncHandler(getUsers));

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     description: Responds with a single user.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: A single user.
 *       404:
 *         description: User not found.
 */
router.route("/:id").get(asyncHandler(getUserById));

export default router;
