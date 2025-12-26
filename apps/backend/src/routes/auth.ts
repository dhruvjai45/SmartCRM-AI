import { Router } from 'express';
import { signupService } from '../services/signup.service';
import { loginService } from '../services/login.service';
import { rotateRefreshToken } from '../services/refresh.service';

const router = Router();

router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, name, companyName } = req.body;

    if (!email || !password || !companyName) {
      return res.status(400).json({
        error: 'email, password and companyName are required'
      });
    }

    const result = await signupService({
      email,
      password,
      name,
      companyName
    });

    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const result = await loginService((email ?? '').toString().trim(), password);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Invalid credentials' });
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken required' });
    }
    const result = await rotateRefreshToken(refreshToken);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
});


export default router;