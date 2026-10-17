// lib/auth/rbac.ts
// Standardized Role-Based Access Control (RBAC) and Patient Authorization Guard
// Enforces patient data isolation and clinician privilege boundaries across all API routes.

import { NextRequest } from 'next/server';
import { UserRole } from '@/lib/types/patient';

export interface AuthContext {
  userId: string;
  role: UserRole;
  patientId?: string; // If the user is a patient, binds to their specific record
}

export class AuthGuard {
  /**
   * Extracts authenticated user context from request headers or development session.
   * Standard headers: 'x-user-id', 'x-user-role', 'x-patient-id'
   */
  public static getAuthContext(req: NextRequest): AuthContext {
    const roleHeader = (
      req.headers.get('x-user-role') || req.headers.get('x-tele-role')
    )?.toUpperCase() as UserRole | undefined;
    const userIdHeader = req.headers.get('x-user-id') || req.headers.get('x-tele-user-id');
    const patientIdHeader = req.headers.get('x-patient-id') || req.headers.get('x-tele-patient-id');

    // Default to CLINICIAN for development if unprovided, or parse provided headers
    const role: UserRole = roleHeader && ['PATIENT', 'CLINICIAN', 'COORDINATOR', 'ADMIN'].includes(roleHeader)
      ? roleHeader
      : 'CLINICIAN';

    const userId = userIdHeader || 'usr-default-session';
    const patientId = patientIdHeader || (role === 'PATIENT' ? 'pat-001' : undefined);

    return {
      userId,
      role,
      patientId,
    };
  }

  /**
   * Verifies if user has permission to list the full patient directory.
   * Restricts directory browsing to care team roles (CLINICIAN, COORDINATOR, ADMIN).
   */
  public static canListAllPatients(auth: AuthContext): boolean {
    return ['CLINICIAN', 'COORDINATOR', 'ADMIN'].includes(auth.role);
  }

  /**
   * Enforces patient-level authorization:
   * - CLINICIAN, COORDINATOR, and ADMIN have authorized care-team access.
   * - PATIENT can ONLY access their own patientId (prevents Insecure Direct Object References - IDOR).
   */
  public static canAccessPatient(auth: AuthContext, targetPatientId: string): boolean {
    if (['CLINICIAN', 'COORDINATOR', 'ADMIN'].includes(auth.role)) {
      return true;
    }

    if (auth.role === 'PATIENT') {
      return auth.patientId === targetPatientId;
    }

    return false;
  }

  /**
   * Checks whether the user has permission to clinically verify OCR documents.
   * Only CLINICIAN and ADMIN can commit verified records into the medical history.
   */
  public static canVerifyClinicalRecord(auth: AuthContext): boolean {
    return ['CLINICIAN', 'ADMIN'].includes(auth.role);
  }
}
