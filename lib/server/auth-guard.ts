import { NextRequest } from 'next/server';
import { UserRole } from '@/lib/types/followup';

export interface AuthContext {
  userId: string;
  role: UserRole;
  isAuthorized: boolean;
}

/**
 * Extracts and validates user identity and role from request headers.
 * Uses standard headers: x-user-id and x-user-role.
 * Defaults to CLINICIAN for development preview if not supplied.
 */
export function getAuthContext(req: NextRequest): AuthContext {
  const roleHeader = req.headers.get('x-user-role')?.toUpperCase() as UserRole | undefined;
  const userIdHeader = req.headers.get('x-user-id') || undefined;

  const validRoles: UserRole[] = ['PATIENT', 'CLINICIAN', 'COORDINATOR', 'ADMIN'];
  const role: UserRole = roleHeader && validRoles.includes(roleHeader) ? roleHeader : 'CLINICIAN';
  const userId = userIdHeader || (role === 'PATIENT' ? 'pat-101' : 'doc-ramanathan');

  return {
    userId,
    role,
    isAuthorized: true,
  };
}

/**
 * Enforces role-based permissions for an operation.
 */
export function checkRolePermission(
  context: AuthContext,
  allowedRoles: UserRole[]
): { allowed: boolean; error?: string } {
  if (!allowedRoles.includes(context.role)) {
    return {
      allowed: false,
      error: `Access Denied: Role '${context.role}' is not authorized to perform this action. Required: [${allowedRoles.join(
        ', '
      )}]`,
    };
  }
  return { allowed: true };
}

/**
 * Prevents cross-patient unauthorized data access.
 * If user is a PATIENT, they may only access their own patient ID.
 * Clinicians, Coordinators, and Admins can access any authorized patient in their care queue.
 */
export function checkPatientAccess(
  context: AuthContext,
  targetPatientId: string
): { allowed: boolean; error?: string } {
  if (context.role === 'PATIENT' && context.userId !== targetPatientId) {
    return {
      allowed: false,
      error: `Forbidden: Patient user '${context.userId}' cannot access or modify medical records for patient '${targetPatientId}'.`,
    };
  }
  return { allowed: true };
}
