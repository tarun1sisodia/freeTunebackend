import { Router } from 'express';
import healthCheckRouter from './healthcheck/index.js';
import authRouter from './user/auth.routes.js';

const router = Router();

// Mount healthcheck routes
router.use('/healthcheck', healthCheckRouter);

// Mount auth routes
router.use('/auth', authRouter);

// TODO: Mount other routes (songs, recommendations) here

export default router;
