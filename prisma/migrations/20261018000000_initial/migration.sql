-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PATIENT', 'CLINICIAN', 'COORDINATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL', 'INDETERMINATE');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING_REVIEW', 'ACCEPTED', 'OVERRIDDEN', 'REJECTED');

-- CreateEnum
CREATE TYPE "AssessmentEngine" AS ENUM ('DETERMINISTIC_RULES_V1', 'CLAUDE_CDS_HYBRID_V1', 'FALLBACK_HEURISTIC');

-- CreateEnum
CREATE TYPE "FactorImpact" AS ENUM ('NORMAL_BASELINE', 'MODERATE_ELEVATION', 'HIGH_RISK_FACTOR', 'CRITICAL_TRIGGER');

-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('HOSPITAL', 'CLINIC', 'DIAGNOSTIC_CENTER', 'WOUND_CARE_CENTER', 'SURGICAL_REHAB');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('SEEDED_DEMO', 'UNVERIFIED', 'PENDING_REVIEW', 'VERIFIED');

-- CreateEnum
CREATE TYPE "ProviderDataSource" AS ENUM ('SYNTHETIC_SEED', 'COMMUNITY_SUBMISSION', 'OFFICIAL_REGISTRY', 'PARTNER_HEALTH_SYSTEM');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('WOUND_CARE', 'SUTURE_REMOVAL', 'DRAIN_MANAGEMENT', 'POST_OP_LABS', 'IMAGING_XRAY', 'PHYSIOTHERAPY', 'GENERAL_POST_OP_EVAL', 'DOPPLER_ULTRASOUND', 'CARDIAC_REHAB');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('DRAFT', 'PENDING_CLINICIAN_APPROVAL', 'DISPATCHED_TO_LOCAL', 'ACCEPTED_BY_LOCAL', 'COMPLETED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FollowUpPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('TELECONSULTATION', 'LOCAL_CLINIC_VISIT', 'HOSPITAL_RETURN', 'DIAGNOSTIC_LAB');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PROPOSED', 'SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'RESCHEDULED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "TeleSessionStatus" AS ENUM ('PENDING', 'READY', 'ACTIVE', 'COMPLETED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPOINTMENT_SCHEDULED', 'APPOINTMENT_REMINDER', 'TELECONSULT_LINK_READY', 'PLAN_UPDATED', 'PAYMENT_CONFIRMED', 'CLINICAL_ALERT');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('DISCHARGE_SUMMARY', 'SURGICAL_NOTES', 'LAB_REPORT', 'PRESCRIPTION', 'WOUND_PHOTO', 'OTHER');

-- CreateEnum
CREATE TYPE "OcrStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED', 'NOT_REQUIRED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'REGISTER', 'ROLE_CHANGE', 'ACCOUNT_STATUS_CHANGE', 'VIEW_PATIENT_RECORD', 'SUBMIT_RECOVERY_LOG', 'CLINICAL_REVIEW', 'RISK_ESCALATION', 'APPOINTMENT_CREATE', 'APPOINTMENT_UPDATE', 'APPOINTMENT_RESCHEDULE', 'APPOINTMENT_CANCEL', 'CONSULTATION_RECORD', 'PROVIDER_VERIFICATION', 'TRAVEL_COMPARISON', 'PAYMENT_CREATE', 'PAYMENT_VERIFIED', 'DOCUMENT_UPLOAD', 'DOCUMENT_VIEW');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "mrn" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "age" INTEGER,
    "gender" TEXT NOT NULL,
    "contactPhone" TEXT,
    "homeCity" TEXT,
    "homeState" TEXT,
    "homePincode" TEXT,
    "originalHospital" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurgeryRecord" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "procedureName" TEXT NOT NULL,
    "operatingCenter" TEXT,
    "operatingHospital" TEXT,
    "hospitalState" TEXT,
    "surgeonName" TEXT NOT NULL,
    "surgeryDate" TIMESTAMP(3) NOT NULL,
    "dischargeDate" TIMESTAMP(3),
    "dischargeSummary" TEXT,
    "postOpDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurgeryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryLog" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "surgeryRecordId" TEXT,
    "postOpDay" INTEGER NOT NULL,
    "logTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "systolicBP" INTEGER,
    "diastolicBP" INTEGER,
    "heartRate" INTEGER,
    "temperatureC" DOUBLE PRECISION,
    "respiratoryRate" INTEGER,
    "oxygenSat" DOUBLE PRECISION,
    "painScore" INTEGER NOT NULL,
    "mobilityLevel" TEXT,
    "symptoms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "woundDescription" TEXT,
    "drainOutputMl" INTEGER,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecoveryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAssessment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "recoveryLogId" TEXT,
    "engine" "AssessmentEngine" NOT NULL DEFAULT 'CLAUDE_CDS_HYBRID_V1',
    "engineVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "inputDataHash" TEXT NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'INDETERMINATE',
    "heuristicScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "requiresInPerson" BOOLEAN NOT NULL DEFAULT false,
    "clinicalSummary" TEXT NOT NULL,
    "factorsJson" JSONB NOT NULL,
    "missingDataJson" JSONB NOT NULL,
    "limitationsJson" JSONB NOT NULL,
    "isEscalated" BOOLEAN NOT NULL DEFAULT false,
    "escalationReason" TEXT,
    "aiStatus" TEXT NOT NULL DEFAULT 'UNCONFIGURED',
    "aiModelName" TEXT,
    "aiResponseTimeMs" INTEGER,
    "aiSummaryText" TEXT,
    "aiQuestionsJson" JSONB,
    "aiFocusAreasJson" JSONB,
    "aiDisclaimersJson" JSONB,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewedById" TEXT,
    "reviewedByName" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "clinicianNotes" TEXT,
    "overrideLevel" "RiskLevel",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskFactor" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "factorTitle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impact" "FactorImpact" NOT NULL DEFAULT 'NORMAL_BASELINE',
    "sourceFieldRef" TEXT NOT NULL,
    "observedValue" TEXT,
    "referenceRange" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalAlert" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "detailedMessage" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicianReview" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "reviewerName" TEXT NOT NULL,
    "reviewerRole" TEXT NOT NULL,
    "decision" "ReviewStatus" NOT NULL,
    "originalLevel" "RiskLevel" NOT NULL,
    "finalLevel" "RiskLevel" NOT NULL,
    "clinicalNotes" TEXT NOT NULL,
    "escalationRaised" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicianReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthcareFacility" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "facilityType" "FacilityType" NOT NULL DEFAULT 'CLINIC',
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" TEXT,
    "email" TEXT,
    "websiteUrl" TEXT,
    "operatingHours" JSONB,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'SEEDED_DEMO',
    "dataSource" "ProviderDataSource" NOT NULL DEFAULT 'SYNTHETIC_SEED',
    "lastVerifiedAt" TIMESTAMP(3),
    "emergencyCapable" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthcareFacility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityService" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "serviceCategory" "ServiceCategory" NOT NULL,
    "specialtyName" TEXT NOT NULL,
    "availableDays" JSONB,
    "requiresPreBooking" BOOLEAN NOT NULL DEFAULT true,
    "estimatedCostINR" DOUBLE PRECISION,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderVerificationRecord" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL,
    "verifierUserId" TEXT,
    "evidenceNotes" TEXT NOT NULL,
    "registryLicenseNo" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderVerificationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareReferral" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "requestedServices" JSONB NOT NULL,
    "referralStatus" "ReferralStatus" NOT NULL DEFAULT 'DRAFT',
    "urgencyLevel" TEXT NOT NULL DEFAULT 'ROUTINE',
    "clinicalSummary" TEXT NOT NULL,
    "attendingPhysicianId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "scheduledDate" TIMESTAMP(3),
    "completionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "facilityType" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'SEEDED_DEMO',
    "servicesOffered" TEXT[],
    "contactPhone" TEXT NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelComparison" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "riskAssessmentId" TEXT,
    "recommendedFacilityId" TEXT,
    "originCity" TEXT NOT NULL,
    "destinationHospital" TEXT NOT NULL,
    "roundTripDistanceKm" DOUBLE PRECISION NOT NULL,
    "estimatedTravelHours" DOUBLE PRECISION NOT NULL,
    "estimatedCostInr" DOUBLE PRECISION NOT NULL,
    "recommendedOption" TEXT NOT NULL,
    "recommendationRationale" TEXT NOT NULL,
    "routeSource" TEXT NOT NULL DEFAULT 'UNAVAILABLE',
    "transportMode" TEXT,
    "candidateOptionsJson" JSONB,
    "originCoordinatesJson" JSONB,
    "isEscalated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravelComparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpPlan" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "riskAssessmentId" TEXT,
    "travelComparisonId" TEXT,
    "title" TEXT NOT NULL,
    "clinicalSummary" TEXT NOT NULL,
    "status" "FollowUpPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedByClinician" TEXT,
    "approvedByClinicianId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "startDate" TIMESTAMP(3) NOT NULL,
    "targetCompletionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "facilityId" TEXT,
    "providerId" TEXT,
    "type" "AppointmentType" NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PROPOSED',
    "scheduledStartTime" TIMESTAMP(3) NOT NULL,
    "scheduledEndTime" TIMESTAMP(3) NOT NULL,
    "locationOrService" TEXT NOT NULL,
    "clinicalNotes" TEXT,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeleconsultationSession" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "domain" TEXT NOT NULL DEFAULT 'meet.jit.si',
    "status" "TeleSessionStatus" NOT NULL DEFAULT 'PENDING',
    "jwtToken" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeleconsultationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationRecord" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "teleSessionId" TEXT,
    "clinicianId" TEXT NOT NULL,
    "subjectiveNotes" TEXT NOT NULL,
    "objectiveFindings" TEXT,
    "assessmentPlan" TEXT NOT NULL,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "nextFollowUpDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "planId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "serviceType" TEXT NOT NULL DEFAULT 'TELECONSULTATION',
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "receipt" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "signatureVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "webhookEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'SIMULATED',
    "linkUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalDocument" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL DEFAULT 'DISCHARGE_SUMMARY',
    "ocrText" TEXT,
    "ocrStatus" "OcrStatus" NOT NULL DEFAULT 'PENDING',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "clinicalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "userRole" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_userId_key" ON "Patient"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_mrn_key" ON "Patient"("mrn");

-- CreateIndex
CREATE INDEX "Patient_userId_idx" ON "Patient"("userId");

-- CreateIndex
CREATE INDEX "Patient_mrn_idx" ON "Patient"("mrn");

-- CreateIndex
CREATE INDEX "Patient_homeCity_homeState_idx" ON "Patient"("homeCity", "homeState");

-- CreateIndex
CREATE INDEX "SurgeryRecord_patientId_idx" ON "SurgeryRecord"("patientId");

-- CreateIndex
CREATE INDEX "RecoveryLog_patientId_idx" ON "RecoveryLog"("patientId");

-- CreateIndex
CREATE INDEX "RecoveryLog_surgeryRecordId_idx" ON "RecoveryLog"("surgeryRecordId");

-- CreateIndex
CREATE INDEX "RecoveryLog_logTimestamp_idx" ON "RecoveryLog"("logTimestamp");

-- CreateIndex
CREATE INDEX "RiskAssessment_patientId_createdAt_idx" ON "RiskAssessment"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "RiskAssessment_reviewStatus_idx" ON "RiskAssessment"("reviewStatus");

-- CreateIndex
CREATE INDEX "RiskAssessment_isEscalated_idx" ON "RiskAssessment"("isEscalated");

-- CreateIndex
CREATE INDEX "RiskAssessment_riskLevel_idx" ON "RiskAssessment"("riskLevel");

-- CreateIndex
CREATE UNIQUE INDEX "RiskAssessment_recoveryLogId_inputDataHash_key" ON "RiskAssessment"("recoveryLogId", "inputDataHash");

-- CreateIndex
CREATE INDEX "RiskFactor_assessmentId_idx" ON "RiskFactor"("assessmentId");

-- CreateIndex
CREATE INDEX "ClinicalAlert_assessmentId_idx" ON "ClinicalAlert"("assessmentId");

-- CreateIndex
CREATE INDEX "ClinicalAlert_severity_idx" ON "ClinicalAlert"("severity");

-- CreateIndex
CREATE INDEX "ClinicianReview_assessmentId_idx" ON "ClinicianReview"("assessmentId");

-- CreateIndex
CREATE INDEX "ClinicianReview_reviewerId_idx" ON "ClinicianReview"("reviewerId");

-- CreateIndex
CREATE INDEX "HealthcareFacility_city_state_idx" ON "HealthcareFacility"("city", "state");

-- CreateIndex
CREATE INDEX "HealthcareFacility_postalCode_idx" ON "HealthcareFacility"("postalCode");

-- CreateIndex
CREATE INDEX "HealthcareFacility_facilityType_idx" ON "HealthcareFacility"("facilityType");

-- CreateIndex
CREATE INDEX "HealthcareFacility_verificationStatus_idx" ON "HealthcareFacility"("verificationStatus");

-- CreateIndex
CREATE INDEX "HealthcareFacility_latitude_longitude_idx" ON "HealthcareFacility"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "FacilityService_facilityId_idx" ON "FacilityService"("facilityId");

-- CreateIndex
CREATE INDEX "FacilityService_serviceCategory_idx" ON "FacilityService"("serviceCategory");

-- CreateIndex
CREATE INDEX "ProviderVerificationRecord_facilityId_idx" ON "ProviderVerificationRecord"("facilityId");

-- CreateIndex
CREATE INDEX "ProviderVerificationRecord_verifierUserId_idx" ON "ProviderVerificationRecord"("verifierUserId");

-- CreateIndex
CREATE INDEX "CareReferral_patientId_idx" ON "CareReferral"("patientId");

-- CreateIndex
CREATE INDEX "CareReferral_facilityId_idx" ON "CareReferral"("facilityId");

-- CreateIndex
CREATE INDEX "CareReferral_referralStatus_idx" ON "CareReferral"("referralStatus");

-- CreateIndex
CREATE INDEX "TravelComparison_patientId_createdAt_idx" ON "TravelComparison"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "TravelComparison_riskAssessmentId_idx" ON "TravelComparison"("riskAssessmentId");

-- CreateIndex
CREATE INDEX "FollowUpPlan_patientId_idx" ON "FollowUpPlan"("patientId");

-- CreateIndex
CREATE INDEX "FollowUpPlan_status_idx" ON "FollowUpPlan"("status");

-- CreateIndex
CREATE INDEX "FollowUpPlan_approvedByClinicianId_idx" ON "FollowUpPlan"("approvedByClinicianId");

-- CreateIndex
CREATE INDEX "Appointment_planId_idx" ON "Appointment"("planId");

-- CreateIndex
CREATE INDEX "Appointment_patientId_idx" ON "Appointment"("patientId");

-- CreateIndex
CREATE INDEX "Appointment_facilityId_idx" ON "Appointment"("facilityId");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TeleconsultationSession_appointmentId_key" ON "TeleconsultationSession"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "TeleconsultationSession_roomName_key" ON "TeleconsultationSession"("roomName");

-- CreateIndex
CREATE INDEX "TeleconsultationSession_roomName_idx" ON "TeleconsultationSession"("roomName");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationRecord_appointmentId_key" ON "ConsultationRecord"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationRecord_teleSessionId_key" ON "ConsultationRecord"("teleSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_receipt_key" ON "PaymentOrder"("receipt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_razorpayOrderId_key" ON "PaymentOrder"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_razorpayPaymentId_key" ON "PaymentOrder"("razorpayPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_webhookEventId_key" ON "PaymentOrder"("webhookEventId");

-- CreateIndex
CREATE INDEX "PaymentOrder_userId_idx" ON "PaymentOrder"("userId");

-- CreateIndex
CREATE INDEX "PaymentOrder_appointmentId_idx" ON "PaymentOrder"("appointmentId");

-- CreateIndex
CREATE INDEX "PaymentOrder_razorpayOrderId_idx" ON "PaymentOrder"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "Notification_recipientUserId_idx" ON "Notification"("recipientUserId");

-- CreateIndex
CREATE INDEX "MedicalDocument_patientId_idx" ON "MedicalDocument"("patientId");

-- CreateIndex
CREATE INDEX "MedicalDocument_documentType_idx" ON "MedicalDocument"("documentType");

-- CreateIndex
CREATE INDEX "MedicalDocument_ocrStatus_idx" ON "MedicalDocument"("ocrStatus");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryRecord" ADD CONSTRAINT "SurgeryRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryLog" ADD CONSTRAINT "RecoveryLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryLog" ADD CONSTRAINT "RecoveryLog_surgeryRecordId_fkey" FOREIGN KEY ("surgeryRecordId") REFERENCES "SurgeryRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_recoveryLogId_fkey" FOREIGN KEY ("recoveryLogId") REFERENCES "RecoveryLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskFactor" ADD CONSTRAINT "RiskFactor_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "RiskAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAlert" ADD CONSTRAINT "ClinicalAlert_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "RiskAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicianReview" ADD CONSTRAINT "ClinicianReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicianReview" ADD CONSTRAINT "ClinicianReview_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "RiskAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityService" ADD CONSTRAINT "FacilityService_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "HealthcareFacility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderVerificationRecord" ADD CONSTRAINT "ProviderVerificationRecord_verifierUserId_fkey" FOREIGN KEY ("verifierUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderVerificationRecord" ADD CONSTRAINT "ProviderVerificationRecord_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "HealthcareFacility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareReferral" ADD CONSTRAINT "CareReferral_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareReferral" ADD CONSTRAINT "CareReferral_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "HealthcareFacility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelComparison" ADD CONSTRAINT "TravelComparison_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelComparison" ADD CONSTRAINT "TravelComparison_riskAssessmentId_fkey" FOREIGN KEY ("riskAssessmentId") REFERENCES "RiskAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelComparison" ADD CONSTRAINT "TravelComparison_recommendedFacilityId_fkey" FOREIGN KEY ("recommendedFacilityId") REFERENCES "HealthcareFacility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpPlan" ADD CONSTRAINT "FollowUpPlan_approvedByClinicianId_fkey" FOREIGN KEY ("approvedByClinicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpPlan" ADD CONSTRAINT "FollowUpPlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpPlan" ADD CONSTRAINT "FollowUpPlan_riskAssessmentId_fkey" FOREIGN KEY ("riskAssessmentId") REFERENCES "RiskAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpPlan" ADD CONSTRAINT "FollowUpPlan_travelComparisonId_fkey" FOREIGN KEY ("travelComparisonId") REFERENCES "TravelComparison"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "FollowUpPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "HealthcareFacility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeleconsultationSession" ADD CONSTRAINT "TeleconsultationSession_planId_fkey" FOREIGN KEY ("planId") REFERENCES "FollowUpPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeleconsultationSession" ADD CONSTRAINT "TeleconsultationSession_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationRecord" ADD CONSTRAINT "ConsultationRecord_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationRecord" ADD CONSTRAINT "ConsultationRecord_teleSessionId_fkey" FOREIGN KEY ("teleSessionId") REFERENCES "TeleconsultationSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_planId_fkey" FOREIGN KEY ("planId") REFERENCES "FollowUpPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalDocument" ADD CONSTRAINT "MedicalDocument_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
