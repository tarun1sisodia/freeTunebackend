import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getUserPreferences, updateUserPreferences } from "../../controllers/user/user.controller.js";

const router = Router();

router.route("/preferences").get(asyncHandler(getUserPreferences)).put(asyncHandler(updateUserPreferences));

export default router;
