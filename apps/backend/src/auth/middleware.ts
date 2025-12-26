import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayloadInternal } from './jwt';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        companyId: string;
        role: string;
      };
    }
  }
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth) return null;

  const [type, token] = auth.split(' ');
  if (type !== 'Bearer' || !token) return null;

  return token;
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    const payload: JwtPayloadInternal = verifyAccessToken(token);

    req.user = {
      userId: payload.sub,
      companyId: payload.cid,
      role: payload.role
    };

    if (!req.user.userId || !req.user.companyId) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    return next();
  } catch (err: any) {
    return res.status(401).json({
      error: err.message || 'Invalid or expired token'
    });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return next();
  };
}