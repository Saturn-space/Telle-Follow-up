// ============================================================================
// API ROUTE: /api/docs/openapi
// GET: OpenAPI 3.0.3 specification for Member 3 Healthcare Provider Directory
// ============================================================================

import { NextResponse } from 'next/server';

export async function GET() {
  const openapiSpec = {
    openapi: '3.0.3',
    info: {
      title: 'Tele-Follow-Up Orchestrator - Local Healthcare Provider Directory API',
      version: '1.0.0',
        description: 'REST API for searching, discovering, and reviewing local healthcare facilities.',
      contact: {
        name: 'Member 3 - Tele-Follow-Up Architecture Team',
        url: 'https://github.com/Saturn-space/Telle-Follow-up',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'Current Environment API Server',
      },
    ],
    tags: [
      { name: 'Providers', description: 'Healthcare facility discovery, filtering, and profiles' },
      { name: 'Verification', description: 'Clinical accreditation and verification audit logging' },
      { name: 'Referrals', description: 'Cross-provider care coordination and follow-up referrals' },
    ],
    paths: {
      '/providers': {
        get: {
          tags: ['Providers'],
          summary: 'Search and filter healthcare facilities',
          parameters: [
            { name: 'searchTerm', in: 'query', schema: { type: 'string' }, description: 'Text search matching name or specialty' },
            { name: 'city', in: 'query', schema: { type: 'string' }, description: 'Filter by city (e.g. Bengaluru, Mumbai)' },
            { name: 'latitude', in: 'query', schema: { type: 'number' }, description: 'Search center latitude (-90 to 90)' },
            { name: 'longitude', in: 'query', schema: { type: 'number' }, description: 'Search center longitude (-180 to 180)' },
            { name: 'radiusKm', in: 'query', schema: { type: 'number', default: 50 }, description: 'Maximum radius in kilometers' },
            { name: 'services', in: 'query', schema: { type: 'string' }, description: 'Comma-separated ServiceCategory enums' },
            { name: 'facilityType', in: 'query', schema: { type: 'string' }, description: 'Comma-separated FacilityType enums' },
            { name: 'verificationStatus', in: 'query', schema: { type: 'string' }, description: 'Filter by verification status. Verified is the default.' },
            { name: 'emergencyOnly', in: 'query', schema: { type: 'boolean' }, description: 'Filter facilities with 24/7 ER' },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          ],
          responses: {
            '200': { description: 'Paginated list of facilities matching criteria' },
            '400': { description: 'Invalid coordinate or query parameters' },
          },
        },
        post: {
          tags: ['Providers'],
          summary: 'Register a new healthcare facility',
          description: 'Requires a signed-in coordinator or administrator session.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'city', 'state', 'postalCode'],
                  properties: {
                    name: { type: 'string' },
                    facilityType: { type: 'string', enum: ['HOSPITAL', 'CLINIC', 'DIAGNOSTIC_CENTER', 'WOUND_CARE_CENTER', 'SURGICAL_REHAB'] },
                    addressLine1: { type: 'string' },
                    city: { type: 'string' },
                    state: { type: 'string' },
                    postalCode: { type: 'string' },
                    latitude: { type: 'number' },
                    longitude: { type: 'number' },
                    phone: { type: 'string' },
                    email: { type: 'string' },
                    websiteUrl: { type: 'string' },
                    emergencyCapable: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Facility created with PENDING_REVIEW status' },
            '403': { description: 'Forbidden - requires COORDINATOR or ADMIN role' },
          },
        },
      },
      '/providers/{providerId}': {
        get: {
          tags: ['Providers'],
          summary: 'Get single facility profile and listed services',
          parameters: [{ name: 'providerId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Detailed facility profile' },
            '404': { description: 'Facility not found' },
          },
        },
        patch: {
          tags: ['Providers'],
          summary: 'Update facility metadata',
          description: 'Requires COORDINATOR or ADMIN role',
          parameters: [{ name: 'providerId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Facility updated' },
            '400': { description: 'Invalid fields or direct verification modification attempt' },
            '403': { description: 'Forbidden' },
            '404': { description: 'Facility not found' },
          },
        },
      },
      '/providers/{providerId}/services': {
        get: {
          tags: ['Providers'],
          summary: 'Get listed services and pricing for a facility',
          parameters: [{ name: 'providerId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'List of facility post-surgical services' },
            '404': { description: 'Facility not found' },
          },
        },
      },
      '/providers/{providerId}/verification': {
        post: {
          tags: ['Verification'],
          summary: 'Record formal clinical verification decision',
          description: 'Requires ADMIN or COORDINATOR role. Mandatory evidenceNotes.',
          parameters: [{ name: 'providerId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status', 'evidenceNotes'],
                  properties: {
                    status: { type: 'string', enum: ['VERIFIED', 'UNVERIFIED'] },
                    evidenceNotes: { type: 'string', minLength: 5 },
                    registryLicenseNo: { type: 'string' },
                    verifierUserId: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Verification decision recorded' },
            '400': { description: 'Missing required evidenceNotes or invalid status' },
            '403': { description: 'Forbidden' },
          },
        },
      },
      '/providers/nearby': {
        get: {
          tags: ['Providers'],
          summary: 'Proximity search sorted strictly by distance',
          parameters: [
            { name: 'lat', in: 'query', required: true, schema: { type: 'number' } },
            { name: 'lng', in: 'query', required: true, schema: { type: 'number' } },
            { name: 'radiusKm', in: 'query', schema: { type: 'number', default: 25 } },
          ],
          responses: {
            '200': { description: 'Nearby facilities sorted by distance' },
            '400': { description: 'Missing lat or lng' },
          },
        },
      },
      '/referrals': {
        get: {
          tags: ['Referrals'],
          summary: 'List care coordination referrals',
          responses: { '200': { description: 'List of active referrals' } },
        },
        post: {
          tags: ['Referrals'],
          summary: 'Dispatch care referral to local facility',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['patientId', 'facilityId', 'requestedServices'],
                  properties: {
                    patientId: { type: 'string' },
                    facilityId: { type: 'string' },
                    requestedServices: { type: 'array', items: { type: 'string' } },
                    urgencyLevel: { type: 'string', enum: ['ROUTINE', 'PRIORITY', 'URGENT'] },
                    clinicalSummary: { type: 'string' },
                    scheduledDate: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          responses: { '201': { description: 'Referral created and dispatched' } },
        },
      },
    },
  };

  return NextResponse.json(openapiSpec);
}
