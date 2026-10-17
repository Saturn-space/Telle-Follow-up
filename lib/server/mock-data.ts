import { Patient, RiskAssessment, Provider, TravelComparison } from '@/lib/types/followup';

// ==========================================
// SYNTHETIC PATIENT RECORDS (Member 1 Stub)
// ==========================================

export const SYNTHETIC_PATIENTS: Patient[] = [
  {
    id: 'pat-101',
    mrn: 'MRN-2026-0811',
    name: 'Rajesh Sharma',
    age: 58,
    gender: 'Male',
    homeCity: 'Bhubaneswar',
    homeState: 'Odisha',
    homePincode: '751024',
    contactPhone: '+91 98765 43210',
    surgeryProcedure: 'Coronary Artery Bypass Graft (CABG x 3)',
    operatingHospital: 'Apollo Specialty Hospital, Chennai',
    surgeonName: 'Dr. V. K. Ramanathan, Senior Cardiothoracic Surgeon',
    dischargeDate: '2026-10-05T10:00:00Z',
  },
  {
    id: 'pat-102',
    mrn: 'MRN-2026-1044',
    name: 'Anita Roy',
    age: 64,
    gender: 'Female',
    homeCity: 'Ranchi',
    homeState: 'Jharkhand',
    homePincode: '834001',
    contactPhone: '+91 94311 22334',
    surgeryProcedure: 'Total Knee Arthroplasty (Left Knee TKA)',
    operatingHospital: 'Fortis Hospital, Bengaluru',
    surgeonName: 'Dr. Meera Iyer, Orthopedic Joint Specialist',
    dischargeDate: '2026-10-08T12:30:00Z',
  },
  {
    id: 'pat-103',
    mrn: 'MRN-2026-1492',
    name: 'Sunita Devi',
    age: 45,
    gender: 'Female',
    homeCity: 'Patna',
    homeState: 'Bihar',
    homePincode: '800001',
    contactPhone: '+91 91223 88776',
    surgeryProcedure: 'Laparoscopic Cholecystectomy',
    operatingHospital: 'AIIMS New Delhi',
    surgeonName: 'Dr. Sandeep Aggarwal, GI Surgeon',
    dischargeDate: '2026-10-12T09:00:00Z',
  },
];

// ==========================================
// SYNTHETIC AI RISK ASSESSMENTS (Member 2 Stub)
// ==========================================

export const SYNTHETIC_RISK_ASSESSMENTS: RiskAssessment[] = [
  {
    id: 'risk-101',
    patientId: 'pat-101',
    riskTier: 'LOW',
    riskScore: 0.18,
    summaryRationale:
      'Sternal incision is clean, dry, and intact with no signs of erythema or discharge. Blood pressure (122/78) and heart rate (72 bpm) stable. Low clinical probability of acute sternal dehiscence or mediastinitis.',
    clinicalRedFlags: [],
    reviewedByDoctor: true,
    doctorNotes: 'Stable post-op day 12. Approved for remote teleconsultation and local blood work.',
    assessedAt: '2026-10-16T14:30:00Z',
  },
  {
    id: 'risk-102',
    patientId: 'pat-102',
    riskTier: 'MEDIUM',
    riskScore: 0.42,
    summaryRationale:
      'Mild localized joint effusion expected at Post-Op Day 9. Range of motion within acceptable baseline. Requires wound inspection and surgical staple removal at Post-Op Day 14 by a trained healthcare professional.',
    clinicalRedFlags: ['Moderate stiffness', 'Local staple removal due on Day 14'],
    reviewedByDoctor: true,
    doctorNotes: 'Eligible for local suture/staple removal at verified neighborhood clinic followed by teleconsult review.',
    assessedAt: '2026-10-16T16:00:00Z',
  },
  {
    id: 'risk-103',
    patientId: 'pat-103',
    riskTier: 'HIGH',
    riskScore: 0.89,
    summaryRationale:
      'CRITICAL: Reported fever of 39.1°C with persistent biliary drainage, localized right upper quadrant peritonism, and tachycardia. High suspicion of post-op collection or bile peritonitis.',
    clinicalRedFlags: [
      'High grade fever (39.1°C)',
      'Acute localized tenderness and guarding',
      'Purulent/bilious drain discharge',
    ],
    reviewedByDoctor: true,
    doctorNotes:
      'URGENT ESCALATION REQUIRED: Remote consultation or non-tertiary clinic visit is unsafe. Patient must report directly to the nearest surgical emergency department or return to operating center immediately.',
    assessedAt: '2026-10-17T07:15:00Z',
  },
];

// ==========================================
// SYNTHETIC HEALTHCARE PROVIDERS (Member 3 Stub)
// ==========================================

export const SYNTHETIC_PROVIDERS: Provider[] = [
  {
    id: 'prov-01',
    name: 'Kalinga Community Health & Surgical Care Clinic',
    facilityType: 'Outpatient Surgical Clinic',
    city: 'Bhubaneswar',
    state: 'Odisha',
    distanceKm: 3.4,
    verificationStatus: 'VERIFIED',
    servicesOffered: ['Wound Dressing', 'Post-Op Vitals Monitoring', 'ECG', 'Basic Phlebotomy'],
    contactPhone: '+91 674 254 1122',
  },
  {
    id: 'prov-02',
    name: 'Apollo Diagnostics Centre — Saheed Nagar',
    facilityType: 'Diagnostic Laboratory',
    city: 'Bhubaneswar',
    state: 'Odisha',
    distanceKm: 4.8,
    verificationStatus: 'VERIFIED',
    servicesOffered: ['CBC', 'Lipid Panel', 'INR/PT Coagulation Panel', 'Digital X-Ray'],
    contactPhone: '+91 674 258 7766',
  },
  {
    id: 'prov-03',
    name: 'Ranchi Ortho & Wound Management Centre',
    facilityType: 'Specialty Outpatient Clinic',
    city: 'Ranchi',
    state: 'Jharkhand',
    distanceKm: 5.2,
    verificationStatus: 'VERIFIED',
    servicesOffered: ['Surgical Staple/Suture Removal', 'Joint Rehabilitation Check', 'Aseptic Dressing'],
    contactPhone: '+91 651 228 3344',
  },
  {
    id: 'prov-04',
    name: 'Patna Regional General Hospital Emergency',
    facilityType: 'Tertiary Emergency Centre',
    city: 'Patna',
    state: 'Bihar',
    distanceKm: 6.1,
    verificationStatus: 'VERIFIED',
    servicesOffered: ['Emergency Surgery', 'Abdominal CT', 'ICU Care', 'Surgical Debridement'],
    contactPhone: '+91 612 230 9999',
  },
];

// ==========================================
// SYNTHETIC TRAVEL COMPARISONS (Member 4 Stub)
// ==========================================

export const SYNTHETIC_TRAVEL_COMPARISONS: TravelComparison[] = [
  {
    id: 'trav-101',
    patientId: 'pat-101',
    originCity: 'Bhubaneswar (Odisha)',
    destinationHospital: 'Apollo Hospital (Chennai, Tamil Nadu)',
    roundTripDistanceKm: 2420,
    estimatedTravelHours: 28.5,
    estimatedCostInr: 16500,
    recommendedOption: 'HYBRID_LOCAL_AND_TELECONSULT',
    recommendationRationale:
      'Long-distance train/flight travel carries physical strain and deep-vein thrombosis risk post-CABG. Patient is clinically stable. Local ECG + teleconsultation avoids 2,420 km round-trip journey and saves ~₹15,000.',
    isEscalated: false,
    createdAt: '2026-10-16T15:00:00Z',
  },
  {
    id: 'trav-102',
    patientId: 'pat-102',
    originCity: 'Ranchi (Jharkhand)',
    destinationHospital: 'Fortis Hospital (Bengaluru, Karnataka)',
    roundTripDistanceKm: 3100,
    estimatedTravelHours: 34.0,
    estimatedCostInr: 18200,
    recommendedOption: 'HYBRID_LOCAL_AND_TELECONSULT',
    recommendationRationale:
      'Post-TKA joint stiffness makes prolonged sitting in transport hazardous. Suture removal is standard outpatient care that can be safely performed at a verified local clinic 5 km away, followed by teleconsult review.',
    isEscalated: false,
    createdAt: '2026-10-16T16:30:00Z',
  },
  {
    id: 'trav-103',
    patientId: 'pat-103',
    originCity: 'Patna (Bihar)',
    destinationHospital: 'AIIMS New Delhi',
    roundTripDistanceKm: 2040,
    estimatedTravelHours: 19.0,
    estimatedCostInr: 11000,
    recommendedOption: 'URGENT_EMERGENCY_ESCALATION',
    recommendationRationale:
      'SAFETY OVERRIDE: Travel cost and convenience optimization are completely suppressed due to severe clinical red flags (suspected bile leak/peritonitis). Immediate tertiary emergency care is mandatory.',
    isEscalated: true,
    createdAt: '2026-10-17T07:30:00Z',
  },
];
