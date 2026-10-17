import {
  CandidateProvider,
  ClinicalRiskContext,
  EscalationEvent,
  PatientTravelContext,
  TravelComparisonResult,
} from './types';

// ========================================================
// REPOSITORY MOCK DATA STORE (SHARED INTEGRATION CONTRACTS)
// ========================================================

export const SEEDED_PATIENTS: PatientTravelContext[] = [
  {
    patientId: 'pt-101',
    name: 'Rajesh Sharma',
    surgeryType: 'Coronary Artery Bypass Graft (CABG)',
    daysPostOp: 14,
    primaryHospitalId: 'hp-apex-delhi',
    primaryHospitalName: 'Apex National Heart Institute, New Delhi',
    origin: {
      latitude: 26.9124,
      longitude: 75.7873,
      label: 'Jaipur, Rajasthan',
      district: 'Jaipur',
      state: 'Rajasthan',
    },
    mobilityConstraint: 'RESTRICTED_SITTING',
  },
  {
    patientId: 'pt-102',
    name: 'Sunita Verma',
    surgeryType: 'Total Knee Replacement (Left)',
    daysPostOp: 10,
    primaryHospitalId: 'hp-metro-mumbai',
    primaryHospitalName: 'Metropolitan Orthopedic Institute, Mumbai',
    origin: {
      latitude: 21.1702,
      longitude: 72.8311,
      label: 'Surat, Gujarat',
      district: 'Surat',
      state: 'Gujarat',
    },
    mobilityConstraint: 'STRETCHER_WHEELCHAIR',
  },
  {
    patientId: 'pt-103',
    name: 'Amitabh Ghosh',
    surgeryType: 'Abdominal Aortic Aneurysm Repair',
    daysPostOp: 8,
    primaryHospitalId: 'hp-max-kolkata',
    primaryHospitalName: 'Max Super Specialty Hospital, Kolkata',
    origin: {
      latitude: 23.6889,
      longitude: 86.9661,
      label: 'Asansol, West Bengal',
      district: 'Paschim Bardhaman',
      state: 'West Bengal',
    },
    mobilityConstraint: 'RESTRICTED_SITTING',
  },
];

export const SEEDED_RISK_CONTEXTS: Record<string, ClinicalRiskContext> = {
  'pt-101': {
    assessmentId: 'risk-asm-101',
    urgencyLevel: 'LOW',
    isEscalated: false,
    redFlags: [],
    assessmentTimestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
    clinicianReviewed: true,
    notes: 'Incision site clean and dry. Normal vital signs logged. Suture removal indicated.',
  },
  'pt-102': {
    assessmentId: 'risk-asm-102',
    urgencyLevel: 'MODERATE',
    isEscalated: false,
    redFlags: ['Mild localized edema at surgical site', 'Moderate pain during active flexion (VAS 5/10)'],
    assessmentTimestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    clinicianReviewed: true,
    notes: 'Non-septic post-op inflammation. Local surgical clinic staple removal acceptable.',
  },
  'pt-103': {
    assessmentId: 'risk-asm-103',
    urgencyLevel: 'CRITICAL',
    isEscalated: true,
    redFlags: [
      'High fever spike (38.9°C / 102°F)',
      'Purulent drainage observed from abdominal midline incision',
      'Sudden tachycardia (HR 118 bpm at rest)',
    ],
    assessmentTimestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    clinicianReviewed: true,
    notes: 'CRITICAL WARNING: Suspected surgical site infection / deep sepsis. Immediate emergency clinical escalation mandatory.',
  },
};

export const SEEDED_PROVIDERS: CandidateProvider[] = [
  // Primary Surgical Centers
  {
    providerId: 'hp-apex-delhi',
    name: 'Apex National Heart Institute',
    facilityType: 'HOSPITAL',
    location: {
      latitude: 28.5672,
      longitude: 77.21,
      label: 'New Delhi, NCR',
      district: 'South Delhi',
      state: 'Delhi',
    },
    isVerified: true,
    verificationBadge: 'STATE_HEALTH_AUTHORITY',
    supportedServices: [
      'POST_OP_WOUND_CARE',
      'SUTURE_REMOVAL',
      'DRAIN_REMOVAL',
      'CARDIAC_REHAB',
      'EMERGENCY_SURGICAL_CARE',
      'DOPPLER_ULTRASOUND',
    ],
    contactPhone: '+91 11 2682 5000',
    operatingHours: '24/7 Tertiary Center',
  },
  {
    providerId: 'hp-metro-mumbai',
    name: 'Metropolitan Orthopedic Institute',
    facilityType: 'HOSPITAL',
    location: {
      latitude: 19.0178,
      longitude: 72.8478,
      label: 'Mumbai, Maharashtra',
      district: 'Mumbai',
      state: 'Maharashtra',
    },
    isVerified: true,
    verificationBadge: 'STATE_HEALTH_AUTHORITY',
    supportedServices: [
      'POST_OP_WOUND_CARE',
      'SUTURE_REMOVAL',
      'STAPLE_REMOVAL',
      'ORTHOPEDIC_IMAGING',
      'EMERGENCY_SURGICAL_CARE',
    ],
    contactPhone: '+91 22 6134 4000',
    operatingHours: '24/7 Tertiary Center',
  },
  // Verified Local Clinics in Jaipur
  {
    providerId: 'hp-jaipur-dist',
    name: 'Jaipur Surgical Care & Day Clinic',
    facilityType: 'SURGICAL_CLINIC',
    location: {
      latitude: 26.892,
      longitude: 75.801,
      label: 'Malviya Nagar, Jaipur',
      district: 'Jaipur',
      state: 'Rajasthan',
    },
    isVerified: true,
    verificationBadge: 'HOSPITAL_AFFILIATE',
    supportedServices: ['POST_OP_WOUND_CARE', 'SUTURE_REMOVAL', 'DRAIN_REMOVAL', 'BASIC_DRESSING'],
    contactPhone: '+91 141 272 1080',
    operatingHours: '08:00 - 20:00 Mon-Sat',
  },
  {
    providerId: 'hp-jaipur-comm',
    name: 'Pink City Community Health Center',
    facilityType: 'WOUND_CARE_CLINIC',
    location: {
      latitude: 26.921,
      longitude: 75.765,
      label: 'Vaishali Nagar, Jaipur',
      district: 'Jaipur',
      state: 'Rajasthan',
    },
    isVerified: true,
    verificationBadge: 'COMMUNITY_PARTNER',
    supportedServices: ['SUTURE_REMOVAL', 'BASIC_DRESSING'],
    contactPhone: '+91 141 235 6789',
    operatingHours: '09:00 - 18:00 Daily',
  },
  {
    providerId: 'hp-jaipur-diag',
    name: 'Arogya Diagnostic & Phlebotomy Lab',
    facilityType: 'DIAGNOSTIC_CENTER',
    location: {
      latitude: 26.875,
      longitude: 75.78,
      label: 'Mansarovar, Jaipur',
      district: 'Jaipur',
      state: 'Rajasthan',
    },
    isVerified: false,
    verificationBadge: 'UNVERIFIED',
    supportedServices: ['BLOOD_TESTS', 'ROUTINE_URINALYSIS'], // Missing surgical wound care!
    contactPhone: '+91 141 298 4432',
    operatingHours: '07:00 - 21:00 Daily',
  },
  // Emergency 24/7 Facilities
  {
    providerId: 'hp-jaipur-er',
    name: 'SMS Hospital Emergency Trauma Wing',
    facilityType: 'HOSPITAL',
    location: {
      latitude: 26.897,
      longitude: 75.815,
      label: 'JLN Marg, Jaipur',
      district: 'Jaipur',
      state: 'Rajasthan',
    },
    isVerified: true,
    verificationBadge: 'STATE_HEALTH_AUTHORITY',
    supportedServices: ['EMERGENCY_SURGICAL_CARE', 'SEPSIS_INTERVENTION', 'ICU_TRAUMA'],
    contactPhone: '+91 141 251 8222',
    operatingHours: '24/7 Emergency Wing',
  },
];

// In-Memory store for persisted comparisons and escalations
export const SAVED_COMPARISONS = new Map<string, TravelComparisonResult>();
export const SAVED_ESCALATIONS = new Map<string, EscalationEvent>();
