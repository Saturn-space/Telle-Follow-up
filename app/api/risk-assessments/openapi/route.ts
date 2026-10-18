import { NextResponse } from 'next/server';

export async function GET() {
  const openApiDoc = {
    openapi: '3.0.3',
    info: {
      title: 'Tele-Follow-Up Orchestrator - Member 2 Risk Prediction & CDS API',
      version: '1.0.0',
      description: 'REST API contracts for post-surgical risk stratification, deterministic physiological safety checks, AI explanations, and clinician review workflows.',
    },
    components: {
      securitySchemes: {
        sessionCookie: { type: 'apiKey', in: 'cookie', name: 'teleflow_session' },
      },
    },
    paths: {
      '/api/risk-assessments/evaluate': {
        post: {
          summary: 'Assess the latest saved recovery entry',
          description: 'Requires a signed-in clinician, coordinator, or administrator. The patientId selects a persisted recovery record; request-supplied vitals are not accepted.',
          security: [{ sessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    patientId: { type: 'string' },
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
          security: [{ sessionCookie: [] }],
          responses: {
            200: { description: 'Assessment details returned' },
            404: { description: 'Assessment not found' },
          },
        },
      },
      '/api/risk-assessments/{assessmentId}/review': {
        post: {
          summary: 'Submit clinician review or override',
          description: 'A clinician records a review. Reviewer identity is derived from the signed-in account.',
          security: [{ sessionCookie: [] }],
          parameters: [{ name: 'assessmentId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['decision', 'clinicalNotes'],
                  properties: {
                    decision: { type: 'string', enum: ['ACCEPTED', 'OVERRIDDEN', 'REJECTED'] },
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
          security: [{ sessionCookie: [] }],
          responses: {
            200: { description: 'List of historical assessments returned' },
          },
        },
      },
    },
  };

  return NextResponse.json(openApiDoc);
}
