// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - RBAC & JWT AUTHENTICATION MIDDLEWARE
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role, JwtPayload } from '../types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'development-jwt-secret-do-not-use-in-production';

/**
 * Middleware: verifyToken
 * Validates the JWT from Authorization header and attaches the decoded
 * user payload ({ userId, role }) to req.user.
 */
export function verifyToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : (req.headers['x-access-token'] as string | undefined);

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access denied: Bearer token is missing or malformed.',
      },
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (!decoded.userId || !decoded.role) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Malformed token payload: userId and role are required.',
        },
      });
      return;
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'EXPIRED_TOKEN',
          message: 'Authentication token has expired. Please re-authenticate.',
        },
      });
      return;
    }

    const message = error instanceof Error ? error.message : 'Invalid token';
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: `Token verification failed: ${message}`,
      },
    });
    return;
  }
}

/**
 * Middleware Factory: requireRole
 * Enforces Role-Based Access Control (RBAC). Returns 403 Forbidden if
 * the authenticated user's role is not authorized.
 */
export function requireRole(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required prior to role enforcement.',
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access forbidden: Role '${req.user.role}' lacks sufficient privileges. Required: [${allowedRoles.join(', ')}]`,
        },
      });
      return;
    }

    next();
  };
}
