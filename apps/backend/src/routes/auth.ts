import { Router } from 'express';
import { signupService } from '../services/signup.service';

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
    next(err); // forward to global error handler
  }
});

export default router;