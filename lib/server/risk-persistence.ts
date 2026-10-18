import { AssessmentEngine, FactorImpact, RiskLevel } from '@/generated/prisma';
import { evaluatePatientRisk } from '@/lib/risk/evaluator';
import { PatientRecoveryInput, RiskAssessmentResult } from '@/lib/risk/types';
import { prisma } from '@/lib/prisma';

type RecoveryWithPatient = Awaited<ReturnType<typeof prisma.recoveryLog.findUnique>> & {
  patient?: {
    id: string;
    fullName: string;
    age: number | null;
    gender: string;
    originalHospital: string | null;
    surgeries: Array<{ id: string; procedureName: string; surgeryDate: Date; dischargeDate: Date | null }>;
  };
};

export async function evaluateAndPersistRecoveryRisk(recoveryLogId: string) {
  const log = await prisma.recoveryLog.findUnique({
    where: { id: recoveryLogId },
    include: {
      patient: {
        include: { surgeries: { orderBy: { surgeryDate: 'desc' }, take: 1 } },
      },
    },
  });
  if (!log) throw new Error('Recovery log was not found.');

  const surgery = log.patient.surgeries[0];
  if (!surgery) throw new Error('Risk assessment is unavailable because no surgery record is linked to this patient.');

  const input: PatientRecoveryInput = {
    patientId: log.patientId,
    patientName: log.patient.fullName,
    patientAge: log.patient.age ?? undefined,
    patientGender: log.patient.gender,
    originalHospital: log.patient.originalHospital || undefined,
    surgeryId: surgery.id,
    procedureName: surgery.procedureName,
    surgeryDate: surgery.surgeryDate.toISOString(),
    dischargeDate: (surgery.dischargeDate || surgery.surgeryDate).toISOString(),
    postOpDay: log.postOpDay,
    recoveryLogId: log.id,
    logTimestamp: log.logTimestamp.toISOString(),
    vitals: {
      systolicBP: log.systolicBP,
      diastolicBP: log.diastolicBP,
      heartRate: log.heartRate,
      temperatureC: log.temperatureC,
      respiratoryRate: log.respiratoryRate,
      oxygenSat: log.oxygenSat,
    },
    painScore: log.painScore,
    mobilityLevel: log.mobilityLevel || undefined,
    symptoms: log.symptoms,
    woundDescription: log.woundDescription,
    drainOutputMl: log.drainOutputMl,
  };

  const result = await evaluatePatientRisk(input, { enableAiExplanation: Boolean(process.env.ANTHROPIC_API_KEY) });
  const existing = await prisma.riskAssessment.findFirst({
    where: { recoveryLogId: log.id, inputDataHash: result.inputDataHash },
    include: { contributingFactors: true, clinicalAlerts: true, reviews: { orderBy: { reviewedAt: 'desc' } } },
  });
  if (existing) return mapRiskAssessment(existing);

  const created = await prisma.riskAssessment.create({
    data: {
      patientId: log.patientId,
      recoveryLogId: log.id,
      engine: result.engine as AssessmentEngine,
      engineVersion: result.engineVersion,
      inputDataHash: result.inputDataHash,
      riskLevel: result.riskLevel as RiskLevel,
      heuristicScore: result.heuristicScore,
      requiresInPerson: result.requiresInPerson,
      clinicalSummary: result.clinicalSummary,
      factorsJson: result.contributingFactors as unknown as object,
      missingDataJson: result.missingDataFlags as unknown as object,
      limitationsJson: result.limitations as unknown as object,
      aiStatus: result.aiSynthesis.aiStatus,
      aiModelName: result.aiSynthesis.modelName,
      aiResponseTimeMs: result.aiSynthesis.responseTimeMs,
      aiSummaryText: result.aiSynthesis.summaryText,
      aiQuestionsJson: result.aiSynthesis.clinicalQuestionsForClinician as unknown as object,
      aiFocusAreasJson: result.aiSynthesis.recommendedFocusAreas as unknown as object,
      aiDisclaimersJson: result.aiSynthesis.disclaimers as unknown as object,
      isEscalated: result.isEscalated,
      escalationReason: result.escalationReason,
      reviewStatus: result.reviewStatus,
      contributingFactors: {
        create: result.contributingFactors.map((factor) => ({
          category: factor.category,
          factorTitle: factor.factorTitle,
          description: factor.description,
          impact: factor.impact as FactorImpact,
          sourceFieldRef: factor.sourceFieldRef,
          observedValue: factor.observedValue,
          referenceRange: factor.referenceRange,
        })),
      },
      clinicalAlerts: {
        create: result.dataQualityAlerts.map((alert) => ({
          alertType: alert.type,
          severity: alert.severity,
          headline: alert.headline,
          detailedMessage: alert.detailedMessage,
        })),
      },
    },
    include: { contributingFactors: true, clinicalAlerts: true, reviews: { orderBy: { reviewedAt: 'desc' } } },
  });

  return mapRiskAssessment(created);
}

export function mapRiskAssessment(record: any): RiskAssessmentResult {
  const aiStatus = ['SUCCESS', 'UNCONFIGURED', 'FAILED', 'SKIPPED'].includes(record.aiStatus) ? record.aiStatus : 'UNCONFIGURED';
  return {
    assessmentId: record.id,
    patientId: record.patientId,
    recoveryLogId: record.recoveryLogId || '',
    timestamp: record.createdAt.toISOString(),
    engine: record.engine,
    engineVersion: record.engineVersion,
    inputDataHash: record.inputDataHash,
    riskLevel: record.riskLevel,
    heuristicScore: record.heuristicScore,
    requiresInPerson: record.requiresInPerson,
    clinicalSummary: record.clinicalSummary,
    contributingFactors: record.contributingFactors || [],
    dataQualityAlerts: (record.clinicalAlerts || []).map((alert: any) => ({
      alertId: alert.id,
      type: alert.alertType,
      severity: alert.severity,
      headline: alert.headline,
      detailedMessage: alert.detailedMessage,
      affectedFields: [],
    })),
    missingDataFlags: Array.isArray(record.missingDataJson) ? record.missingDataJson : [],
    limitations: Array.isArray(record.limitationsJson) ? record.limitationsJson : [],
    isEscalated: record.isEscalated,
    escalationReason: record.escalationReason,
    aiSynthesis: {
      aiStatus,
      modelName: record.aiModelName || undefined,
      responseTimeMs: record.aiResponseTimeMs || undefined,
      summaryText: record.aiSummaryText || undefined,
      clinicalQuestionsForClinician: Array.isArray(record.aiQuestionsJson) ? record.aiQuestionsJson : [],
      recommendedFocusAreas: Array.isArray(record.aiFocusAreasJson) ? record.aiFocusAreasJson : [],
      disclaimers: Array.isArray(record.aiDisclaimersJson) ? record.aiDisclaimersJson : [],
    },
    reviewStatus: record.reviewStatus,
    latestReview: record.reviews?.[0] || null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
