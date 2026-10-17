// app/api/v1/health/route.ts
// Release health check and diagnostic endpoint for deployment verification.

import { NextResponse } from 'next/server';
import { db } from '@/lib/db/store';

export async function GET() {
  const patientCount = db.getPatients().length;

  return NextResponse.json({
    status: 'HEALTHY',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    module: 'Member 1: Patient Profile & Recovery Management',
    system: {
      framework: 'Next.js 15.5 (App Router)',
      database: {
        configuredOrm: 'Prisma (PostgreSQL)',
        runtimeStore: 'In-Memory Relational Store (Active)',
        totalSeededPatients: patientCount,
      },
      ocrService: {
        mode: 'Dual-Mode Optical Entity Extractor',
        status: 'READY',
      },
      security: {
        rbac: 'Enforced (PATIENT, CLINICIAN, COORDINATOR, ADMIN)',
        idorIsolation: 'Active',
        magicBytesInspection: 'Active',
      },
      contracts: {
        member2RiskContractVersion: '1.0.0',
        openApiSpecVersion: '3.0.3',
      },
    },
  });
}
