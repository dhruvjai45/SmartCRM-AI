// src/routes/users.ts
import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import {
  listCompanyUsers,
  updateUserRole,
  setUserActiveStatus
} from '../services/users.service';

const router = Router();

router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const users = await listCompanyUsers(req.user!.companyId);
  res.json({ users });
});

router.patch('/:id/role', requireAuth, requireRole('admin'), async (req, res) => {
  const { role } = req.body;
  const targetUserId = req.params.id;

  if (!['admin', 'manager', 'sales'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  await updateUserRole(
    req.user!.companyId,
    targetUserId,
    role,
    req.user!.userId
  );

  res.json({ ok: true });
});

router.patch('/:id/status', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  
  console.log(req.body, typeof req.body.isActive);

  if (typeof req.body?.isActive !== 'boolean') {
    return res.status(400).json({
      error: 'isActive must be a boolean'
    });
  }

  await setUserActiveStatus(
    req.user!.companyId,
    id,
    req.body.isActive,
    req.user!.userId
  );

  res.json({ ok: true });
});

export default router;