import { NextResponse } from 'next/server';
import { SEEDED_PATIENTS, SEEDED_RISK_CONTEXTS, SEEDED_PROVIDERS } from '@/lib/travel/data-store';

export async function GET() {
  const patientOptions = SEEDED_PATIENTS.map((p) => ({
    ...p,
    clinicalRisk: SEEDED_RISK_CONTEXTS[p.patientId] ?? {
      urgencyLevel: 'LOW',
      isEscalated: false,
      redFlags: [],
    },
  }));

  return NextResponse.json({
    success: true,
    data: {
      patients: patientOptions,
      providers: SEEDED_PROVIDERS,
      supportedServices: [
        { code: 'POST_OP_WOUND_CARE', label: 'Surgical Wound Care & Debridement' },
        { code: 'SUTURE_REMOVAL', label: 'Suture / Staple Removal' },
        { code: 'DRAIN_REMOVAL', label: 'Surgical Jackson-Pratt Drain Removal' },
        { code: 'CARDIAC_REHAB', label: 'Post-CABG Monitored Physical Rehab' },
        { code: 'DOPPLER_ULTRASOUND', label: 'Venous Doppler DVT Screening' },
      ],
    },
    error: null,
    meta: { timestamp: new Date().toISOString() },
  });
}
