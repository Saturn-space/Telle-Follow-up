import './load-next-env';
import { prisma } from '../lib/prisma';
import { randomUUID } from 'node:crypto';
import { AppointmentType, TeleSessionStatus } from '../generated/prisma';


export async function provisionPatientDemoData(patientId: string) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      followUpPlans: { include: { appointments: true } },
      surgeries: true,
    },
  });

  if (!patient) {
    console.log(`Patient ${patientId} not found.`);
    return null;
  }

  if (patient.followUpPlans.length > 0 && patient.followUpPlans[0].appointments.length > 0) {
    console.log(`Patient ${patient.fullName} already has ${patient.followUpPlans.length} care plan(s).`);
    return patient.followUpPlans[0];
  }

  const clinician = await prisma.user.findFirst({ where: { role: 'CLINICIAN' } });
  const facility = await prisma.healthcareFacility.findFirst();

  // Create Surgery if none exists
  if (patient.surgeries.length === 0) {
    const surgeryDate = new Date();
    surgeryDate.setDate(surgeryDate.getDate() - 5);
    await prisma.surgeryRecord.create({
      data: {
        patientId: patient.id,
        procedureName: 'Coronary Artery Bypass Graft (CABG)',
        surgeryDate,
        dischargeDate: new Date(),
        surgeonName: 'Dr. Sarah Jenkins, MS (CTVS)',
        operatingHospital: facility?.name || 'Apollo Speciality Hospitals',
        hospitalState: facility?.state || 'Tamil Nadu',
        dischargeSummary: 'Synthetic demo summary for local software testing.',
        postOpDays: 5,
      },
    });
  }

  // Create FollowUpPlan
  const startDate = new Date();
  const targetCompletionDate = new Date();
  targetCompletionDate.setDate(targetCompletionDate.getDate() + 30);

  const plan = await prisma.followUpPlan.create({
    data: {
      patientId: patient.id,
      title: 'Post-CABG Follow-Up & Telehealth Rehabilitation Plan',
      clinicalSummary: 'Post-operative recovery monitoring protocol including scheduled teleconsultations, wound inspection, and vitals assessment.',
      status: 'ACTIVE',
      approvedByClinician: clinician?.email || 'Dr. Sarah Jenkins',
      approvedByClinicianId: clinician?.id,
      approvedAt: new Date(),
      startDate,
      targetCompletionDate,
    },
  });

  // Appointment 1: Teleconsultation
  const teleTime = new Date();
  teleTime.setDate(teleTime.getDate() + 1);
  teleTime.setHours(10, 30, 0, 0);
  const teleEndTime = new Date(teleTime.getTime() + 45 * 60 * 1000);

  const teleAppt = await prisma.appointment.create({
    data: {
      planId: plan.id,
      patientId: patient.id,
      type: AppointmentType.TELECONSULTATION,
      status: 'SCHEDULED',
      scheduledStartTime: teleTime,
      scheduledEndTime: teleEndTime,
      locationOrService: 'Teleconsultation - Post-Operative Review (45 min)',
      clinicalNotes: 'Check chest wound healing, review ECG telemetry report, and assess pain management medications.',
      facilityId: facility?.id,
    },
  });

  if (clinician) {
    await prisma.teleconsultationSession.create({
      data: {
        planId: plan.id,
        appointmentId: teleAppt.id,
        roomName: `teleflow-session-${randomUUID().replace(/-/g, '').slice(0, 24)}`,
        domain: process.env.JITSI_DOMAIN || 'meet.jit.si',
        status: TeleSessionStatus.READY,
      },
    });
  }

  // Appointment 2: In-Person Local Clinic
  const clinicTime = new Date();
  clinicTime.setDate(clinicTime.getDate() + 4);
  clinicTime.setHours(14, 0, 0, 0);
  const clinicEndTime = new Date(clinicTime.getTime() + 45 * 60 * 1000);

  await prisma.appointment.create({
    data: {
      planId: plan.id,
      patientId: patient.id,
      type: AppointmentType.LOCAL_CLINIC_VISIT,
      status: 'SCHEDULED',
      scheduledStartTime: clinicTime,
      scheduledEndTime: clinicEndTime,
      locationOrService: 'Wound Care & Suture Removal Review (Apollo Speciality)',
      clinicalNotes: 'In-person sternal wound check, removal of remaining sutures, and local dressing.',
      facilityId: facility?.id,
    },
  });

  console.log(`Successfully provisioned care plan and appointments for ${patient.fullName} (${patient.id})`);
  return plan;
}

async function run() {
  if (process.env.NODE_ENV === 'production' || process.env.DEMO_MODE !== 'true') {
    throw new Error('Demo provisioning requires a non-production process with DEMO_MODE=true.');
  }
  const databaseUrl = new URL(process.env.DATABASE_URL || '');
  const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\//, ''));
  if (!['localhost', '127.0.0.1', '::1'].includes(databaseUrl.hostname.toLowerCase()) || databaseName !== 'tele_follow_up_demo') {
    throw new Error('Demo provisioning is restricted to the local tele_follow_up_demo database.');
  }
  const patients = await prisma.patient.findMany({ select: { id: true, fullName: true, userId: true } });
  console.log(`Found ${patients.length} patient(s) in database.`);
  for (const p of patients) {
    await provisionPatientDemoData(p.id);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
