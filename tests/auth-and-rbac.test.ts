import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

import { POST as loginRoute } from '../app/api/auth/login/route';
import { POST as registerRoute } from '../app/api/auth/register/route';
import { GET as meRoute } from '../app/api/auth/me/route';
import { POST as logoutRoute } from '../app/api/auth/logout/route';
import { getAuthContext, signSessionToken } from '../lib/server/auth-guard';

const patient = {
  id: 'user-test-patient',
  email: 'patient@test.org',
  role: 'PATIENT' as const,
  passwordHash: '',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  patientProfile: {
    id: 'patient-test-profile',
    mrn: 'MRN-TEST-001',
    fullName: 'Test Patient',
  },
};

describe('Authentication, Registration, and Session RBAC Endpoints', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-only-auth-signing-secret-32-bytes';
    patient.passwordHash = await bcrypt.hash('CorrectPassword123!', 4);
    prismaMock.user.findUnique.mockResolvedValue(patient);
    prismaMock.user.create.mockImplementation(async ({ data }: { data: Record<string, any> }) => ({
      ...patient,
      id: 'user-created-patient',
      email: data.email,
      role: data.role,
      patientProfile: {
        ...patient.patientProfile,
        id: 'patient-created-profile',
        fullName: data.patientProfile.create.fullName,
      },
    }));
    prismaMock.auditLog.create.mockResolvedValue({ id: 'audit-test' });
  });

  it('rejects login with an invalid password', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: patient.email, password: 'WrongPassword999!' }),
    });

    const res = await loginRoute(req);
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(prismaMock.user.findUnique).toHaveBeenCalledOnce();
  });

  it('authenticates a patient and sets an HTTP-only session cookie', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: patient.email, password: 'CorrectPassword123!' }),
    });

    const res = await loginRoute(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.user.email).toBe(patient.email);
    expect(json.data.user.role).toBe('PATIENT');
    expect(json.data.redirectUrl).toBe('/patients/dashboard');
    expect(res.headers.get('set-cookie')).toContain('teleflow_session=');
    expect(res.headers.get('set-cookie')).toContain('HttpOnly');
  });

  it('forces public registration to the patient role', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Automated Test User',
        email: 'newpatient@test.org',
        password: 'SecurePass@123',
        role: 'ADMIN',
      }),
    });

    const res = await registerRoute(req);
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.data.user.role).toBe('PATIENT');
    expect(json.data.user.email).toBe('newpatient@test.org');
    expect(prismaMock.user.create).toHaveBeenCalledOnce();
    expect(prismaMock.user.create.mock.calls[0][0].data.role).toBe('PATIENT');
  });

  it('rejects duplicate email registration', async () => {
    prismaMock.user.create.mockRejectedValueOnce({ code: 'P2002' });
    const req = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'Duplicate Patient', email: patient.email, password: 'SecurePass@123' }),
    });

    const res = await registerRoute(req);
    expect(res.status).toBe(409);
  });

  it('returns current user details for a valid bearer session', async () => {
    const token = signSessionToken({ userId: patient.id, email: patient.email, role: patient.role });
    const req = new NextRequest('http://localhost:3000/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const res = await meRoute(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.user.role).toBe('PATIENT');
    expect(json.data.user.email).toBe(patient.email);
  });

  it('does not accept client-supplied identity headers as authentication', () => {
    const req = new NextRequest('http://localhost:3000/api/protected', {
      headers: { 'x-user-id': 'user-test-patient', 'x-user-role': 'ADMIN' },
    });

    expect(getAuthContext(req).isAuthorized).toBe(false);
  });

  it('clears the session cookie on logout', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/logout', { method: 'POST' });
    const res = await logoutRoute(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toContain('Max-Age=0');
  });
});
