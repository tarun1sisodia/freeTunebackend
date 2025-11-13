import { Router } from 'express';
import healthCheckRouter from './healthcheck/index.js';
import authRouter from './user/auth.routes.js';
import songsRouter from './songs/index.js';
import playlistsRouter from './playlists/index.js';

const router = Router();

// Mount healthcheck routes
router.use('/healthcheck', healthCheckRouter);

// Mount auth routes
router.use('/auth', authRouter);

// Mount songs routes (includes upload & streaming)
router.use('/songs', songsRouter);

// Mount playlists routes
router.use('/playlists', playlistsRouter);

// TODO: Mount recommendations routes

export default router;
