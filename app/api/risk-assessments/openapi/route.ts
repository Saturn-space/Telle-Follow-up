import { NextResponse } from 'next/server';

export async function GET() {
  const openApiDoc = {
    openapi: '3.0.3',
    info: {
      title: 'Tele-Follow-Up Orchestrator - Member 2 Risk Prediction & CDS API',
      version: '1.0.0',
      description: 'REST API contracts for post-surgical risk stratification, deterministic physiological safety checks, AI explanations, and clinician review workflows.',
    },
    paths: {
      '/api/risk-assessments/evaluate': {
        post: {
          summary: 'Trigger AI-assisted post-surgical risk evaluation',
          description: 'Consumes validated recovery observations from Member 1, computes deterministic physiological score and red flags, calls Claude for structured explanation if configured, and records auditable assessment.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    patientId: { type: 'string', example: 'pat_chole_01' },
                    enableAiExplanation: { type: 'boolean', default: true },
                    recoveryInput: {
                      type: 'object',
                      description: 'Full recovery log input matching PatientRecoveryInput',
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Assessment created successfully' },
            400: { description: 'Bad request / missing required inputs' },
            422: { description: 'Input validation error' },
          },
        },
      },
      '/api/risk-assessments/{assessmentId}': {
        get: {
          summary: 'Get assessment by ID',
          parameters: [{ name: 'assessmentId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Assessment details returned' },
            404: { description: 'Assessment not found' },
          },
        },
      },
      '/api/risk-assessments/{assessmentId}/review': {
        post: {
          summary: 'Submit clinician review or override',
          description: 'Authorized clinician signs off, overrides risk score, or triggers formal escalation to operating surgeon.',
          parameters: [{ name: 'assessmentId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['decision', 'reviewerName', 'reviewerRole'],
                  properties: {
                    decision: { type: 'string', enum: ['ACCEPTED', 'OVERRIDDEN', 'REJECTED'] },
                    reviewerName: { type: 'string', example: 'Dr. Priya Sundaram' },
                    reviewerRole: { type: 'string', enum: ['SURGEON', 'LOCAL_DOCTOR', 'COORDINATOR'] },
                    overrideLevel: { type: 'string', enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] },
                    clinicalNotes: { type: 'string' },
                    escalateToOperatingSurgeon: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Review logged and assessment updated' },
            400: { description: 'Invalid review payload' },
            404: { description: 'Assessment not found' },
          },
        },
      },
      '/api/patients/{patientId}/risk-assessments': {
        get: {
          summary: 'List assessment history for patient',
          parameters: [{ name: 'patientId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'List of historical assessments returned' },
          },
        },
      },
    },
  };

  return NextResponse.json(openApiDoc);
}
