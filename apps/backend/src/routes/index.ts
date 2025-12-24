// src/routes/index.ts
import { Router } from 'express';
import health from './health';

const router = Router();

router.use('/health', health);

// future: router.use('/auth', authRouter); router.use('/leads', leadsRouter)
export default router;