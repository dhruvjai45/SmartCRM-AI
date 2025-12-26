import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import { createInvitation } from '../services/invite.service';
import { acceptInvitation } from '../services/acceptInvite.service';

const router = Router();

router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { email, role } = req.body;

      if (!email || !role) {
        return res.status(400).json({
          error: 'email and role are required'
        });
      }

      if (!['admin', 'manager', 'sales'].includes(role)) {
        return res.status(400).json({
          error: 'Invalid role'
        });
      }

      const result = await createInvitation({
        companyId: req.user!.companyId,
        invitedByUserId: req.user!.userId,
        email,
        role
      });

      return res.status(201).json({
        message: 'Invitation created',
        invitation: result
      });
    } catch (err: any) {
      return res.status(400).json({
        error: err.message || 'Failed to create invitation'
      });
    }
  }
);


router.post('/accept', async (req, res) => {
  const { token, name, password } = req.body;

  if (!token || !name || !password) {
    return res.status(400).json({ error: 'token, name, password required' });
  }

  try {
    const result = await acceptInvitation(token, name, password);
    return res.status(201).json({
      message: 'Invitation accepted',
      user: result.user,
      companyId: result.companyId
    });
  } catch (err: any) {
    return res.status(400).json({
      error: err.message || 'Failed to accept invitation'
    });
  }
});

export default router;