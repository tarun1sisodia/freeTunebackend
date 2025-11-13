import { Router } from "express";
import healthCheckRouter from "./healthcheck/index.js";
import songsRouter from "./songs/index.js";
import userRouter from "./user/index.js";
import recommendationsRouter from "./recommendations/index.js";

const router = Router();

// Mount healthcheck routes
router.use("/healthcheck", healthCheckRouter);

// Mount other routes
router.use("/songs", songsRouter);
router.use("/users", userRouter);
router.use("/recommendations", recommendationsRouter);

export default router;
