// src/routes/index.ts
import { Router } from 'express';
import health from './health';
import ready from './ready';
import auth from './auth';

const router = Router();

router.use('/health', health);
router.use('/ready', ready);
router.use('/auth', auth);

export default router;