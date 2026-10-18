import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findUnique: vi.fn(), create: vi.fn() },
    clinicianRegistrationApplication: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

import { POST as clinicianRegister } from '../app/api/auth/clinician-register/route';
import { POST as reviewApplication } from '../app/api/admin/clinician-applications/[applicationId]/route';
import { signSessionToken } from '../lib/server/auth-guard';

const application = {
  id: 'application-1',
  fullName: 'Demo Doctor',
  email: 'doctor@test.org',
  passwordHash: 'hashed-password',
  medicalLicenseNumber: 'LIC-TEST-1234',
  specialty: 'Cardiology',
  institution: 'Test Hospital',
  phone: null,
  city: null,
  status: 'PENDING',
  reviewedById: null,
  reviewedAt: null,
  userId: null,
};

describe('Clinician registration and administrator approval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-only-clinician-session-key-32-bytes';
    prismaMock.user.findUnique.mockImplementation(async ({ where }: { where: { id?: string; email?: string } }) => {
      if (where.id === 'admin-1') return { id: 'admin-1', email: 'admin@test.org', role: 'ADMIN', patientProfile: null };
      return null;
    });
    prismaMock.clinicianRegistrationApplication.findUnique.mockResolvedValue(null);
    prismaMock.clinicianRegistrationApplication.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...application, ...data }));
    prismaMock.auditLog.create.mockResolvedValue({ id: 'audit-1' });
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => Promise<unknown>) => callback(prismaMock));
  });

  it('stores a doctor application as pending without creating a privileged account', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/clinician-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Demo Doctor',
        email: 'doctor@test.org',
        password: 'ClinicianPass123!',
        medicalLicenseNumber: 'LIC-TEST-1234',
        specialty: 'Cardiology',
        institution: 'Test Hospital',
      }),
    });

    const response = await clinicianRegister(request);
    const body = await response.json();
    expect(response.status).toBe(202);
    expect(body.data.application.status).toBe('PENDING');
    expect(prismaMock.clinicianRegistrationApplication.create).toHaveBeenCalledOnce();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    const saved = prismaMock.clinicianRegistrationApplication.create.mock.calls[0][0].data;
    expect(saved.passwordHash).not.toBe('ClinicianPass123!');
  });

  it('requires a strong password and professional details', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/clinician-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'Demo Doctor', email: 'doctor@test.org', password: 'short' }),
    });
    const response = await clinicianRegister(request);
    expect(response.status).toBe(400);
    expect(prismaMock.clinicianRegistrationApplication.create).not.toHaveBeenCalled();
  });

  it('creates the clinician login only after an administrator approves the application', async () => {
    prismaMock.clinicianRegistrationApplication.findUnique.mockResolvedValue(application);
    prismaMock.user.create.mockResolvedValue({ id: 'clinician-1', email: application.email, role: 'CLINICIAN' });
    prismaMock.clinicianRegistrationApplication.update.mockResolvedValue({
      id: application.id,
      fullName: application.fullName,
      email: application.email,
      specialty: application.specialty,
      status: 'APPROVED',
      userId: 'clinician-1',
    });
    const token = signSessionToken({ userId: 'admin-1', email: 'admin@test.org', role: 'ADMIN' });
    const request = new NextRequest('http://localhost:3000/api/admin/clinician-applications/application-1', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'APPROVE' }),
    });

    const response = await reviewApplication(request, { params: Promise.resolve({ applicationId: application.id }) });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.application.status).toBe('APPROVED');
    expect(prismaMock.user.create).toHaveBeenCalledOnce();
    expect(prismaMock.user.create.mock.calls[0][0].data.role).toBe('CLINICIAN');
    expect(prismaMock.auditLog.create).toHaveBeenCalledOnce();
  });
});
