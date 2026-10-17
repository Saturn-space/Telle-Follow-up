// app/api/v1/openapi/route.ts
// OpenAPI 3.0 specification for Member 1 (Patient Registration & Recovery Monitoring)

import { NextResponse } from 'next/server';

export async function GET() {
  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'Tele-Follow-Up Orchestrator - Member 1 API',
      version: '1.0.0',
      description:
        'REST APIs for Patient Registration, Surgery/Discharge Tracking, Recovery Monitoring, Vitals Logging, and Medical Document Management with OCR Review.',
    },
    servers: [
      {
        url: '/api/v1',
        description: 'Local development and staging gateway',
      },
    ],
    paths: {
      '/patients': {
        get: {
          summary: 'List patients',
          description: 'Search and query registered patients with synthetic demographic data.',
          parameters: [
            {
              name: 'search',
              in: 'query',
              schema: { type: 'string' },
              description: 'Filter by name, MRN, or city',
            },
          ],
          responses: {
            '200': { description: 'List of patients' },
          },
        },
        post: {
          summary: 'Register a patient',
          description: 'Register a new post-surgical patient profile.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['fullName', 'dateOfBirth', 'homeCity', 'homeState', 'homeZip'],
                  properties: {
                    fullName: { type: 'string', example: 'Eleanor Vance' },
                    dateOfBirth: { type: 'string', format: 'date', example: '1964-04-12' },
                    gender: { type: 'string', example: 'Female' },
                    phone: { type: 'string', example: '+1 (555) 234-5678' },
                    homeAddress: { type: 'string', example: '442 Prairie Ridge Way' },
                    homeCity: { type: 'string', example: 'Springfield' },
                    homeState: { type: 'string', example: 'IL' },
                    homeZip: { type: 'string', example: '62704' },
                    emergencyContact: { type: 'string', example: 'Thomas Vance - Spouse' },
                    mrn: { type: 'string', example: 'TFO-2026-001' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Patient registered successfully' },
            '400': { description: 'Validation error' },
            '409': { description: 'Duplicate MRN' },
          },
        },
      },
      '/patients/{id}': {
        get: {
          summary: 'Retrieve patient profile',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Patient details and surgical context' },
            '404': { description: 'Patient not found' },
          },
        },
        patch: {
          summary: 'Update patient profile',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Updated patient record' },
          },
        },
      },
      '/patients/{id}/surgeries': {
        get: {
          summary: 'List surgical records for patient',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Surgical history' } },
        },
        post: {
          summary: 'Record surgical procedure and discharge guidelines',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '201': { description: 'Surgery recorded' } },
        },
      },
      '/patients/{id}/recovery-observations': {
        get: {
          summary: 'Retrieve patient recovery observations and vitals',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Observation history' } },
        },
        post: {
          summary: 'Log daily recovery observation with pain score and vitals',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '201': { description: 'Observation recorded' } },
        },
      },
      '/patients/{id}/documents': {
        get: {
          summary: 'List uploaded medical documents and OCR extraction states',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Documents list' } },
        },
        post: {
          summary: 'Upload document and trigger OCR extraction',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '201': { description: 'Document uploaded and OCR processed' } },
        },
      },
      '/patients/{id}/documents/{docId}': {
        get: {
          summary: 'Retrieve individual medical document metadata',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'docId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Document metadata retrieved' },
            '404': { description: 'Document not found' },
          },
        },
        delete: {
          summary: 'Authorized deletion/purge of medical document and associated OCR extraction',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'docId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Document purged successfully' },
            '403': { description: 'Staff authorization required (patient cannot purge medical records)' },
            '404': { description: 'Document not found' },
          },
        },
      },
      '/patients/{id}/documents/{docId}/ocr/review': {
        put: {
          summary: 'Review and verify OCR extracted text into medical record',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'docId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'OCR verified' } },
        },
      },
      '/patients/{id}/timeline': {
        get: {
          summary: 'Get consolidated longitudinal recovery timeline',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Ordered timeline events' } },
        },
      },
      '/patients/{id}/member2-contract': {
        get: {
          summary: 'Get structured clinical data for Member 2 Risk Assessment engine',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Standardized risk input payload' } },
        },
      },
    },
  };

  return NextResponse.json(spec);
}
