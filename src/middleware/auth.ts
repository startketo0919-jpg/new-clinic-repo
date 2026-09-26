import { Request, Response, NextFunction } from 'express';
import { verifyAuthToken, TokenPayload } from '../db/auth-utils.js';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

/**
 * Enforces staff/doctor/admin authentication via Bearer token
 */
export const requireStaffAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Staff session required. Please log in.' });
  }

  const token = authHeader.split('Bearer ')[1].trim();
  const payload = verifyAuthToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized: Session expired or invalid. Please log in again.' });
  }

  req.user = payload;
  next();
};

/**
 * Enforces Superadmin privilege (role === 'admin')
 */
export const requireAdminAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  let token: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split('Bearer ')[1].trim();
  } else if (typeof req.query.token === 'string') {
    token = req.query.token.trim();
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Administrator session required.' });
  }

  const payload = verifyAuthToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized: Session expired or invalid. Please log in again.' });
  }

  if (payload.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Administrator privilege required for this action.' });
  }

  req.user = payload;
  next();
};

/**
 * Optional authentication: Attaches user payload if valid token is present
 */
export const optionalAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1].trim();
    const payload = verifyAuthToken(token);
    if (payload) {
      req.user = payload;
    }
  }
  next();
};

// Default export alias
export const requireAuth = requireStaffAuth;
