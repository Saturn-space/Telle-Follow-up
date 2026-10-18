// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - CENTRAL AUTHENTICATION TYPES
// ============================================================================

export type Role = 'PATIENT' | 'CLINICIAN' | 'COORDINATOR';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  name?: string;
  createdAt: Date;
}

export interface JwtPayload {
  userId: string;
  role: Role;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
