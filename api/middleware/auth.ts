import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type UserRole = 'HR_ADMIN' | 'MANAGER' | 'WORKER';

export interface AuthTokenPayload {
  userId: string;
  tenantId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret';

// Fail-safe: Reject insecure secret in production
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'dev-insecure-secret') {
  console.error('❌ FATAL: JWT_SECRET must be set in production');
  process.exit(1);
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing bearer token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    if (!decoded.userId || !decoded.tenantId || !decoded.role) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token payload' });
    }
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}

export function signAuthToken(payload: Omit<AuthTokenPayload, 'iat' | 'exp'>, expiresIn: string = '1h'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] });
}
