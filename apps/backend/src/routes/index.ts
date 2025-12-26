// apps/backend/src/routes/index.ts
import { Router } from 'express';
import health from './health';
import ready from './ready';
import auth from './auth';
import authLogout from './authLogout';
import { requireAuth, requireRole } from '../auth/middleware';

const router = Router();

router.use('/health', health);
router.use('/ready', ready);
router.use('/auth', auth);
router.use('/auth/logout', authLogout);

router.get('/protected-demo', requireAuth, (req, res) => {
  return res.json({ hello: 'protected', user: req.user });
});

router.get('/admin-only-demo', requireAuth, requireRole('admin'), (req, res) => {
  return res.json({ ok: true, admin: req.user });
});

export default router;