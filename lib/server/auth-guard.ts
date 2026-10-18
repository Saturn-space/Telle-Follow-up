import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { UserRole } from '@/lib/types/followup';
import { prisma } from '@/lib/prisma';

const roles: UserRole[] = ['PATIENT', 'CLINICIAN', 'COORDINATOR', 'ADMIN'];

export interface AuthContext {
  userId: string;
  patientId?: string;
  email?: string;
  role: UserRole;
  isAuthorized: boolean;
  error?: string;
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === 'test') {
    return 'tele-follow-up-test-only-signing-key-32-bytes-minimum';
  }
  throw new Error('JWT_SECRET must be configured with at least 32 characters.');
}

export function signSessionToken(payload: {
  userId: string;
  email: string;
  role: UserRole;
  patientId?: string;
}): string {
  return jwt.sign(payload, getJwtSecret(), {
    algorithm: 'HS256',
    expiresIn: '24h',
    issuer: 'tele-follow-up',
    audience: 'tele-follow-up-web',
  });
}

export function getAuthContext(req: NextRequest): AuthContext {
  const authorization = req.headers.get('authorization');
  const bearer = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  const token = bearer || req.cookies?.get?.('teleflow_session')?.value;

  if (token) {
    try {
      const decoded = jwt.verify(token, getJwtSecret(), {
        algorithms: ['HS256'],
        issuer: 'tele-follow-up',
        audience: 'tele-follow-up-web',
      });
      if (typeof decoded === 'object' && decoded !== null && (decoded.sub || decoded.userId)) {
        const userId = String(decoded.userId || decoded.sub);
        const role = decoded.role;
        if (roles.includes(role as UserRole)) {
          return {
            userId,
            patientId: typeof decoded.patientId === 'string' ? decoded.patientId : undefined,
            email: typeof decoded.email === 'string' ? decoded.email : undefined,
            role: role as UserRole,
            isAuthorized: true,
          };
        }
      }
    } catch {
      return { userId: '', role: 'PATIENT', isAuthorized: false, error: 'Invalid or expired session.' };
    }
  }

  return { userId: '', role: 'PATIENT', isAuthorized: false, error: 'A valid session is required.' };
}

/** Re-check the account's current database role so stale JWT claims cannot retain access. */
export async function getVerifiedAuthContext(req: NextRequest): Promise<AuthContext> {
  const tokenContext = getAuthContext(req);
  if (!tokenContext.isAuthorized) return tokenContext;

  const user = await prisma.user.findUnique({
    where: { id: tokenContext.userId },
    select: { id: true, email: true, role: true, patientProfile: { select: { id: true } } },
  });
  if (!user || user.role !== tokenContext.role) {
    return { userId: '', role: 'PATIENT', isAuthorized: false, error: 'Your session is no longer valid. Sign in again.' };
  }
  return { ...tokenContext, email: user.email, role: user.role, patientId: user.patientProfile?.id };
}

export function checkRolePermission(
  context: AuthContext,
  allowedRoles: UserRole[]
): { allowed: boolean; error?: string } {
  if (!context.isAuthorized) return { allowed: false, error: 'Authentication is required.' };
  if (!allowedRoles.includes(context.role)) {
    return { allowed: false, error: 'Your account is not permitted to perform this action.' };
  }
  return { allowed: true };
}

export function checkPatientAccess(
  context: AuthContext,
  targetPatientId: string
): { allowed: boolean; error?: string } {
  if (!context.isAuthorized) return { allowed: false, error: 'Authentication is required.' };
  if (context.role === 'PATIENT' && context.patientId !== targetPatientId) {
    return { allowed: false, error: 'Patients may access only their own records.' };
  }
  return { allowed: true };
}
