import './load-next-env';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import {
  AppointmentStatus,
  AppointmentType,
  AssessmentEngine,
  FacilityType,
  FollowUpPlanStatus,
  ProviderDataSource,
  ReviewStatus,
  RiskLevel,
  Role,
  ServiceCategory,
  TeleSessionStatus,
  VerificationStatus,
} from '../generated/prisma';

import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();
const demoAccounts = {
  admin: { email: 'demo.admin@teleflow.local', password: 'LocalDemoAdmin!2026', role: Role.ADMIN },
  clinician: { email: 'demo.doctor@teleflow.local', password: 'LocalDemoDoctor!2026', role: Role.CLINICIAN },
  patient: { email: 'demo.patient@teleflow.local', password: 'LocalDemoPatient!2026', role: Role.PATIENT },
  applicant: { email: 'demo.applicant@teleflow.local', password: 'LocalDemoApplicant!2026' },
} as const;

function requireLocalDemoDatabase() {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo accounts cannot be seeded in production.');
  if (process.env.DEMO_MODE !== 'true') throw new Error('Set DEMO_MODE=true to explicitly enable local demo data seeding.');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  let databaseUrl: URL;
  try {
    databaseUrl = new URL(process.env.DATABASE_URL);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL.');
  }
  const hostname = databaseUrl.hostname.toLowerCase();
  if (!['localhost', '127.0.0.1', '::1'].includes(hostname)) {
    throw new Error('Demo seeding is restricted to localhost PostgreSQL. No data was changed.');
  }
  const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\//, ''));
  if (databaseName !== 'tele_follow_up_demo') {
    throw new Error('Demo seeding is restricted to the dedicated tele_follow_up_demo database. No data was changed.');
  }
}

async function ensureUser(email: string, password: string, role: Role) {
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.role !== role) {
    throw new Error(`The local demo email ${email} already exists with a different role. No role was changed.`);
  }
  if (existing) return prisma.user.update({ where: { id: existing.id }, data: { passwordHash } });
  return prisma.user.create({ data: { email, passwordHash, role } });
}

async function main() {
  requireLocalDemoDatabase();
  const admin = await ensureUser(demoAccounts.admin.email, demoAccounts.admin.password, demoAccounts.admin.role);
  const clinician = await ensureUser(demoAccounts.clinician.email, demoAccounts.clinician.password, demoAccounts.clinician.role);
  const patientUser = await ensureUser(demoAccounts.patient.email, demoAccounts.patient.password, demoAccounts.patient.role);
  const applicantPasswordHash = await bcrypt.hash(demoAccounts.applicant.password, 12);
  await prisma.clinicianRegistrationApplication.upsert({
    where: { email: demoAccounts.applicant.email },
    update: {},
    create: {
      fullName: 'Local Demo Applicant',
      email: demoAccounts.applicant.email,
      passwordHash: applicantPasswordHash,
      medicalLicenseNumber: 'DEMO-NOT-REAL-0001',
      specialty: 'Prototype review only',
      institution: 'Tele-Follow-Up local demo',
      city: 'Madurai',
      status: 'PENDING',
    },
  });

  const demoFacility = await prisma.healthcareFacility.upsert({
    where: { id: 'local-demo-facility-v1' },
    update: {
      name: 'Synthetic Local Demo Clinic (Not Real)',
      facilityType: FacilityType.CLINIC,
      addressLine1: 'Synthetic demo listing — not a real address',
      city: 'Bengaluru',
      state: 'Karnataka — Demo Only',
      postalCode: '000000',
      country: 'India',
      latitude: 12.9716,
      longitude: 77.6416,
      verificationStatus: VerificationStatus.SEEDED_DEMO,
      dataSource: ProviderDataSource.SYNTHETIC_SEED,
      isActive: true,
    },
    create: {
      id: 'local-demo-facility-v1',
      name: 'Synthetic Local Demo Clinic (Not Real)',
      facilityType: FacilityType.CLINIC,
      addressLine1: 'Synthetic demo listing — not a real address',
      city: 'Bengaluru',
      state: 'Karnataka — Demo Only',
      postalCode: '000000',
      country: 'India',
      latitude: 12.9716,
      longitude: 77.6416,
      verificationStatus: VerificationStatus.SEEDED_DEMO,
      dataSource: ProviderDataSource.SYNTHETIC_SEED,
      isActive: true,
    },
  });
  await prisma.facilityService.upsert({
    where: { id: 'local-demo-facility-service-v1' },
    update: {
      facilityId: demoFacility.id,
      serviceCategory: ServiceCategory.WOUND_CARE,
      specialtyName: 'Synthetic wound care example',
      requiresPreBooking: true,
      description: 'Synthetic example only. No real clinical service is provided.',
    },
    create: {
      id: 'local-demo-facility-service-v1',
      facilityId: demoFacility.id,
      serviceCategory: ServiceCategory.WOUND_CARE,
      specialtyName: 'Synthetic wound care example',
      requiresPreBooking: true,
      description: 'Synthetic example only. No real clinical service is provided.',
    },
  });

  const patientProfile = await prisma.patient.upsert({
    where: { userId: patientUser.id },
    update: {
      fullName: 'Local Demo Patient',
      age: 48,
      gender: 'Not specified',
      contactPhone: '+91 90000 00000',
      homeCity: 'Madurai',
      homeState: 'Tamil Nadu',
      homePincode: '625001',
    },
    create: {
      userId: patientUser.id,
      mrn: 'MRN-LOCAL-DEMO-0001',
      fullName: 'Local Demo Patient',
      age: 48,
      gender: 'Not specified',
      contactPhone: '+91 90000 00000',
      homeCity: 'Madurai',
      homeState: 'Tamil Nadu',
      homePincode: '625001',
      originalHospital: 'Local demo fixture',
    },
  });

  const surgeryDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  surgeryDate.setHours(9, 0, 0, 0);
  const dischargeDate = new Date(surgeryDate.getTime() + 3 * 24 * 60 * 60 * 1000);
  const surgery = await prisma.surgeryRecord.upsert({
    where: { id: 'local-demo-surgery-v1' },
    update: {
      patientId: patientProfile.id,
      procedureName: 'Local Demo Surgical Procedure',
      operatingCenter: 'Local demo fixture',
      operatingHospital: 'Local demo fixture',
      hospitalState: 'Tamil Nadu',
      surgeonName: 'Local Demo Clinician',
      surgeryDate,
      dischargeDate,
      dischargeSummary: 'Synthetic discharge summary for software testing only.',
      postOpDays: 5,
    },
    create: {
      id: 'local-demo-surgery-v1',
      patientId: patientProfile.id,
      procedureName: 'Local Demo Surgical Procedure',
      operatingCenter: 'Local demo fixture',
      operatingHospital: 'Local demo fixture',
      hospitalState: 'Tamil Nadu',
      surgeonName: 'Local Demo Clinician',
      surgeryDate,
      dischargeDate,
      dischargeSummary: 'Synthetic discharge summary for software testing only.',
      postOpDays: 5,
    },
  });

  const recoveryLog = await prisma.recoveryLog.upsert({
    where: { id: 'local-demo-recovery-log-v1' },
    update: {
      patientId: patientProfile.id,
      surgeryRecordId: surgery.id,
      postOpDay: 5,
      painScore: 2,
      mobilityLevel: 'INDEPENDENT',
      symptoms: [],
      woundDescription: 'LOCAL DEMO FIXTURE — synthetic data for software testing only.',
      systolicBP: 120,
      diastolicBP: 78,
      heartRate: 72,
      temperatureC: 36.8,
      oxygenSat: 98,
    },
    create: {
      id: 'local-demo-recovery-log-v1',
      patientId: patientProfile.id,
      surgeryRecordId: surgery.id,
      postOpDay: 5,
      painScore: 2,
      mobilityLevel: 'INDEPENDENT',
      symptoms: [],
      woundDescription: 'LOCAL DEMO FIXTURE — synthetic data for software testing only.',
      systolicBP: 120,
      diastolicBP: 78,
      heartRate: 72,
      temperatureC: 36.8,
      oxygenSat: 98,
    },
  });

  const now = new Date();
  const assessment = await prisma.riskAssessment.upsert({
    where: { recoveryLogId_inputDataHash: { recoveryLogId: recoveryLog.id, inputDataHash: 'local-demo-v1' } },
    update: {
      patientId: patientProfile.id,
      riskLevel: RiskLevel.LOW,
      reviewStatus: ReviewStatus.ACCEPTED,
      reviewedById: clinician.id,
      reviewedByName: 'Local Demo Clinician',
      reviewedAt: now,
      clinicianNotes: 'Synthetic local-only demo review. Not a clinical judgment.',
    },
    create: {
      patientId: patientProfile.id,
      recoveryLogId: recoveryLog.id,
      engine: AssessmentEngine.DETERMINISTIC_RULES_V1,
      engineVersion: 'LOCAL_DEMO_FIXTURE_V1',
      inputDataHash: 'local-demo-v1',
      riskLevel: RiskLevel.LOW,
      heuristicScore: 0.1,
      requiresInPerson: false,
      clinicalSummary: 'LOCAL DEMO FIXTURE — synthetic data for software testing only.',
      factorsJson: [{ factor: 'synthetic-demo-data', impact: 'LOW' }],
      missingDataJson: [],
      limitationsJson: ['Synthetic local fixture. Not for patient care.'],
      isEscalated: false,
      aiStatus: 'UNCONFIGURED',
      reviewStatus: ReviewStatus.ACCEPTED,
      reviewedById: clinician.id,
      reviewedByName: 'Local Demo Clinician',
      reviewedAt: now,
      clinicianNotes: 'Synthetic local-only demo review. Not a clinical judgment.',
    },
  });

  const plan = await prisma.followUpPlan.upsert({
    where: { id: 'local-demo-follow-up-plan-v1' },
    update: {
      patientId: patientProfile.id,
      riskAssessmentId: assessment.id,
      status: FollowUpPlanStatus.ACTIVE,
      approvedByClinicianId: clinician.id,
      approvedByClinician: 'Local Demo Clinician',
      approvedAt: now,
      startDate: now,
    },
    create: {
      id: 'local-demo-follow-up-plan-v1',
      patientId: patientProfile.id,
      riskAssessmentId: assessment.id,
      title: 'Local Demo Follow-Up Plan',
      clinicalSummary: 'Synthetic local-only demo plan. Not for patient care.',
      status: FollowUpPlanStatus.ACTIVE,
      approvedByClinicianId: clinician.id,
      approvedByClinician: 'Local Demo Clinician',
      approvedAt: now,
      startDate: now,
    },
  });

  const appointmentStart = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  appointmentStart.setMinutes(0, 0, 0);
  const appointmentEnd = new Date(appointmentStart.getTime() + 30 * 60 * 1000);
  const appointment = await prisma.appointment.upsert({
    where: { id: 'local-demo-teleconsult-v1' },
    update: {
      planId: plan.id,
      patientId: patientProfile.id,
      type: AppointmentType.TELECONSULTATION,
      status: AppointmentStatus.SCHEDULED,
      scheduledStartTime: appointmentStart,
      scheduledEndTime: appointmentEnd,
      locationOrService: 'Local demo video follow-up',
      clinicalNotes: 'Synthetic local-only demo appointment. Not for patient care.',
    },
    create: {
      id: 'local-demo-teleconsult-v1',
      planId: plan.id,
      patientId: patientProfile.id,
      type: AppointmentType.TELECONSULTATION,
      status: AppointmentStatus.SCHEDULED,
      scheduledStartTime: appointmentStart,
      scheduledEndTime: appointmentEnd,
      locationOrService: 'Local demo video follow-up',
      clinicalNotes: 'Synthetic local-only demo appointment. Not for patient care.',
    },
  });

  const domain = (process.env.JITSI_DOMAIN || 'meet.jit.si').replace(/^https?:\/\//, '').replace(/\/$/, '');
  await prisma.teleconsultationSession.upsert({
    where: { appointmentId: appointment.id },
    update: { domain, status: TeleSessionStatus.READY },
    create: {
      planId: plan.id,
      appointmentId: appointment.id,
      roomName: `tfo-demo-${randomBytes(12).toString('hex')}`,
      domain,
      status: TeleSessionStatus.READY,
    },
  });

  console.log('Local demo patient, clinician, administrator, pending application, synthetic facility, reviewed sample workflow, billable appointment, and video room were seeded.');
  console.log('These synthetic records are for software testing only.');
  console.log(`Demo administrator: ${demoAccounts.admin.email}`);
  console.log(`Demo clinician: ${demoAccounts.clinician.email}`);
  console.log(`Demo patient: ${demoAccounts.patient.email}`);
  console.log(`Demo pending clinician application: ${demoAccounts.applicant.email}`);
  console.log('Passwords are documented in README.md.');
  const billingReady = process.env.PAYMENTS_ENABLED === 'true'
    && Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_WEBHOOK_SECRET);
  console.log(billingReady
    ? 'Razorpay test checkout is configured from the local environment; no payment was captured.'
    : 'Billing checkout is disabled until complete Razorpay test credentials are configured.');
  console.log('The Jitsi demo room uses the configured domain and does not require app credentials.');
}

main()
  .catch((error) => {
    console.error('Local demo seed failed:', error instanceof Error ? error.message : 'unknown error');
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
