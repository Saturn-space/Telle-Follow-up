import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import jwt from 'jsonwebtoken';
import app from '../backend/src/app';

const JWT_SECRET = process.env.JWT_SECRET || 'development-jwt-secret-do-not-use-in-production';

describe('Phase 5: Express Central Gateway & Cross-Module Integration E2E', () => {
  let server: http.Server;
  let baseUrl: string;

  let patientToken: string;
  let clinicianToken: string;
  let coordinatorToken: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as AddressInfo).port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // Generate authenticated test tokens
    patientToken = jwt.sign(
      { userId: 'pat-101', email: 'pat101@example.com', role: 'PATIENT' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    clinicianToken = jwt.sign(
      { userId: 'doc-ramanathan', email: 'ramanathan@hospital.org', role: 'CLINICIAN' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    coordinatorToken = jwt.sign(
      { userId: 'coord-01', email: 'coord@hospital.org', role: 'COORDINATOR' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('1. Health & Central Gateway Validation', () => {
    it('returns 200 OK for /health check', async () => {
      const res = await fetch(`${baseUrl}/health`);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.status).toBe('HEALTHY');
      expect(body.service).toBe('tele-follow-up-orchestrator-backend');
    });

    it('returns 404 with structured JSON for nonexistent endpoints', async () => {
      const res = await fetch(`${baseUrl}/api/v1/nonexistent-route`);
      const body = await res.json();
      expect(res.status).toBe(404);
      expect(body.error.code).toBe('ROUTE_NOT_FOUND');
    });
  });

  describe('2. Authentication & Cryptographic Token Verification', () => {
    it('rejects protected routes without Authorization header with 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/patients`);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects invalid or tampered JWT token with 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/patients`, {
        headers: { Authorization: 'Bearer invalid.tampered.token' },
      });
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe('INVALID_TOKEN');
    });

    it('rejects expired JWT token with 401 EXPIRED_TOKEN', async () => {
      const expiredToken = jwt.sign(
        { userId: 'pat-101', role: 'PATIENT' },
        JWT_SECRET,
        { expiresIn: '-10s' }
      );
      const res = await fetch(`${baseUrl}/api/v1/patients`, {
        headers: { Authorization: `Bearer ${expiredToken}` },
      });
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe('EXPIRED_TOKEN');
    });
  });

  describe('3. Role-Based Access Control (RBAC) & Endpoint Isolation', () => {
    it('forbids PATIENT from accessing privileged /api/v1/risk-assessments with 403', async () => {
      const res = await fetch(`${baseUrl}/api/v1/risk-assessments/evaluate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${patientToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('forbids PATIENT from accessing privileged /api/v1/travel with 403', async () => {
      const res = await fetch(`${baseUrl}/api/v1/travel/compare`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${patientToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('allows CLINICIAN to access /api/v1/travel/compare', async () => {
      const res = await fetch(`${baseUrl}/api/v1/travel/compare`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${clinicianToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: 'pt-101',
          origin: { latitude: 26.9124, longitude: 75.7873, label: 'Jaipur, Rajasthan' },
          requiredService: 'SUTURE_REMOVAL',
          transportMode: 'DRIVING',
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });
  });

  describe('4. Insecure Direct Object Reference (IDOR) Protection', () => {
    it('blocks patient pat-101 from querying patient pat-102 with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/v1/patients/pat-102`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe('FORBIDDEN_CROSS_PATIENT_ACCESS');
    });

    it('blocks patient pat-101 from submitting recovery logs for pat-102 with 403', async () => {
      const res = await fetch(`${baseUrl}/api/v1/patients/pat-102/recovery-log`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${patientToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postOpDay: 4,
          painScore: 3,
          vitals: { temperature: 37.1 },
        }),
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe('FORBIDDEN_CROSS_PATIENT_ACCESS');
    });

    it('permits authorized CLINICIAN to view any patient record', async () => {
      const res = await fetch(`${baseUrl}/api/v1/patients/pat-101`, {
        headers: { Authorization: `Bearer ${clinicianToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe('pat-101');
    });
  });

  describe('5. Cross-Module Data Handoff: Recovery Telemetry (M1) -> Risk CDS (M2)', () => {
    it('ingests recovery telemetry and triggers Risk Engine with deterministic output', async () => {
      const telemetry = {
        postOpDay: 3,
        painScore: 4,
        mobilityLevel: 'ASSISTED_WALKING',
        vitals: {
          temperature: 37.2,
          heartRate: 78,
          systolicBp: 124,
          diastolicBp: 82,
          respiratoryRate: 16,
          oxygenSaturation: 98,
        },
        symptoms: ['Mild surgical site tightness'],
        woundDescription: 'Clean, dry, intact port dressings.',
        drainOutputMl: 15,
      };

      const res = await fetch(`${baseUrl}/api/v1/patients/pat-101/recovery-log`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${patientToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(telemetry),
      });

      expect([200, 201]).toContain(res.status);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.recoveryEntry).toBeDefined();
      expect(body.data.riskAssessment).toBeDefined();
      expect(body.data.riskAssessment.patientId).toBe('pat-101');
      expect(body.data.riskAssessment.riskLevel).toBeDefined();
    });

    it('enforces idempotency: identical resubmission returns cached evaluation', async () => {
      const telemetry = {
        postOpDay: 5,
        painScore: 2,
        vitals: {
          temperature: 36.9,
          heartRate: 72,
          systolicBp: 120,
          diastolicBp: 80,
          respiratoryRate: 15,
          oxygenSaturation: 99,
        },
        symptoms: ['No complaint'],
      };

      // Submission 1
      const res1 = await fetch(`${baseUrl}/api/v1/patients/pat-101/recovery-log`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${patientToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(telemetry),
      });
      const body1 = await res1.json();
      expect([200, 201]).toContain(res1.status);

      // Submission 2 (identical telemetry)
      const res2 = await fetch(`${baseUrl}/api/v1/patients/pat-101/recovery-log`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${patientToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(telemetry),
      });
      const body2 = await res2.json();
      expect(res2.status).toBe(200);
      expect(body2.data.isIdempotentReplay).toBe(true);
      expect(body2.data.riskAssessment.assessmentId).toBe(body1.data.riskAssessment.assessmentId);
    });
  });

  describe('6. Module 3: Local Provider Discovery Directory', () => {
    it('returns verified healthcare facilities with city filtering', async () => {
      const res = await fetch(`${baseUrl}/api/v1/providers?city=Bengaluru`, {
        headers: { Authorization: `Bearer ${clinicianToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('7. Module 5: Follow-Up Care Plans & Appointments', () => {
    it('allows clinician to create an approved follow-up care plan', async () => {
      const res = await fetch(`${baseUrl}/api/v1/follow-ups/plans`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${clinicianToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: 'pat-101',
          title: 'Post-Cholecystectomy Routine Follow-Up',
          clinicalSummary: 'Stable recovery with plan for teleconsult suture inspection',
          startDate: '2026-11-01T10:00:00Z',
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
    });
  });
});
