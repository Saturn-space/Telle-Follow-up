import { AuthContext, checkRolePermission } from '@/lib/server/auth-guard';
import { prisma } from '@/lib/prisma';

export class AccessError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'AccessError';
  }
}

export function requireAuthenticated(context: AuthContext): void {
  if (!context.isAuthorized) throw new AccessError('A valid session is required.', 401);
}

export function requireRoles(context: AuthContext, roles: AuthContext['role'][]): void {
  const permission = checkRolePermission(context, roles);
  if (!permission.allowed) {
    throw new AccessError(permission.error || 'You are not permitted to perform this action.', context.isAuthorized ? 403 : 401);
  }
}

export async function requirePatientAccess(
  context: AuthContext,
  patientId: string,
  options: { allowUnassignedClinician?: boolean } = {}
) {
  requireAuthenticated(context);
  const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true, userId: true } });
  if (!patient) throw new AccessError('Patient record was not found.', 404);

  if (context.role === 'PATIENT') {
    const linkedPatient = await prisma.patient.findUnique({ where: { userId: context.userId }, select: { id: true } });
    if (!linkedPatient || linkedPatient.id !== patient.id) {
      throw new AccessError('Patients may access only their own records.', 403);
    }
    return patient;
  }

  if (context.role === 'CLINICIAN') {
    const assigned = await prisma.followUpPlan.findFirst({
      where: { patientId, approvedByClinicianId: context.userId },
      select: { id: true },
    });
    const reviewed = await prisma.riskAssessment.findFirst({
      where: {
        patientId,
        OR: [
          { reviewedById: context.userId },
          { reviews: { some: { reviewerId: context.userId } } },
        ],
      },
      select: { id: true },
    });
    if (!assigned && !reviewed && !options.allowUnassignedClinician) {
      throw new AccessError('This patient is not assigned to your clinician account.', 403);
    }
  }

  return patient;
}

export function mapPatient(patient: {
  id: string;
  mrn: string;
  fullName: string;
  age: number | null;
  gender: string;
  homeCity: string | null;
  homeState: string | null;
  homePincode: string | null;
  contactPhone: string | null;
  originalHospital: string | null;
  surgeries?: Array<{
    procedureName: string;
    operatingHospital: string | null;
    surgeonName: string;
    surgeryDate: Date;
    dischargeDate: Date | null;
    dischargeSummary: string | null;
  }>;
}) {
  const surgery = patient.surgeries?.[0];
  return {
    id: patient.id,
    mrn: patient.mrn,
    name: patient.fullName,
    age: patient.age ?? 0,
    gender: patient.gender,
    homeCity: patient.homeCity || '',
    homeState: patient.homeState || '',
    homePincode: patient.homePincode || '',
    contactPhone: patient.contactPhone || '',
    surgeryProcedure: surgery?.procedureName || 'Procedure not recorded',
    operatingHospital: surgery?.operatingHospital || patient.originalHospital || 'Hospital not recorded',
    surgeonName: surgery?.surgeonName || 'Care team not recorded',
    surgeryDate: surgery?.surgeryDate?.toISOString() || '',
    dischargeDate: surgery?.dischargeDate?.toISOString() || '',
    dischargeSummary: surgery?.dischargeSummary || '',
  };
}
