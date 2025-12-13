import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { authMiddleware } from "../../middleware/auth.js";
import { getUserPreferences, updateUserPreferences, getUploadedSongs } from "../../controllers/user/user.controller.js";

const router = Router();

router.route("/preferences").get(authMiddleware, asyncHandler(getUserPreferences)).put(authMiddleware, asyncHandler(updateUserPreferences));

router.get("/songs", authMiddleware, asyncHandler(getUploadedSongs));

export default router;
