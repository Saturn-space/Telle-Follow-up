// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - MEMBER 3 REPOSITORY LAYER
// Healthcare Facility Directory, Proximity Search & Verification Store
// ============================================================================

import {
  HealthcareFacilityItem,
  FacilityServiceItem,
  VerificationRecordItem,
  CareReferralItem,
  ProviderSearchParams,
  PaginatedResult,
  Coordinates,
  ServiceCategory,
  FacilityType,
  VerificationStatus,
} from '@/lib/types/provider';

// ----------------------------------------------------------------------------
// GEOSPATIAL HELPER (Haversine Formula)
// ----------------------------------------------------------------------------

/**
 * Calculates the great-circle distance between two points on the Earth's surface in kilometers.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // 1 decimal place accuracy
}

// ----------------------------------------------------------------------------
// SEED DATA FACTORY (High-Fidelity Synthetic Healthcare Directory)
// ----------------------------------------------------------------------------

const INITIAL_FACILITIES: HealthcareFacilityItem[] = [
  // 1. Bengaluru - Verified Clinic
  {
    id: 'fac_blr_001',
    name: 'St. Jude Post-Surgical Recovery & Wound Center',
    facilityType: 'WOUND_CARE_CENTER',
    addressLine1: '45/2 100 Feet Road, HAL 2nd Stage, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560038',
    country: 'India',
    latitude: 12.9719,
    longitude: 77.6412,
    phone: '+91 80 2520 1144',
    email: 'indiranagar.care@stjuderecovery.org',
    websiteUrl: 'https://stjuderecovery.org/indiranagar',
    operatingHours: {
      mon: '08:00 - 20:00',
      tue: '08:00 - 20:00',
      wed: '08:00 - 20:00',
      thu: '08:00 - 20:00',
      fri: '08:00 - 20:00',
      sat: '09:00 - 17:00',
      sun: '10:00 - 13:00',
    },
    verificationStatus: 'VERIFIED',
    dataSource: 'OFFICIAL_REGISTRY',
    lastVerifiedAt: '2026-09-14T10:00:00.000Z',
    emergencyCapable: false,
    createdAt: '2026-01-10T08:30:00.000Z',
    updatedAt: '2026-09-14T10:00:00.000Z',
    services: [
      {
        id: 'srv_blr_001_1',
        facilityId: 'fac_blr_001',
        serviceCategory: 'WOUND_CARE',
        specialtyName: 'Advanced Post-Op Wound Debridement & Negative Pressure Dressing',
        availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
        requiresPreBooking: true,
        estimatedCostINR: 850,
        description: 'Sterile surgical site inspection, vacuum-assisted closure checks, and dressing changes.',
        createdAt: '2026-01-10T08:30:00.000Z',
        updatedAt: '2026-01-10T08:30:00.000Z',
      },
      {
        id: 'srv_blr_001_2',
        facilityId: 'fac_blr_001',
        serviceCategory: 'SUTURE_REMOVAL',
        specialtyName: 'Suture & Surgical Staple Removal',
        availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
        requiresPreBooking: false,
        estimatedCostINR: 450,
        description: 'Aseptic removal of deep dermal or skin staples/sutures with wound edge assessment.',
        createdAt: '2026-01-10T08:30:00.000Z',
        updatedAt: '2026-01-10T08:30:00.000Z',
      },
      {
        id: 'srv_blr_001_3',
        facilityId: 'fac_blr_001',
        serviceCategory: 'DRAIN_MANAGEMENT',
        specialtyName: 'Jackson-Pratt & Hemovac Drain Monitoring',
        availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        requiresPreBooking: true,
        estimatedCostINR: 600,
        description: 'Output measurement, seroma drainage inspection, and drain site sanitization.',
        createdAt: '2026-01-10T08:30:00.000Z',
        updatedAt: '2026-01-10T08:30:00.000Z',
      },
    ],
    verifications: [
      {
        id: 'ver_blr_001',
        facilityId: 'fac_blr_001',
        status: 'VERIFIED',
        verifierUserId: 'usr_coord_dr_sharma',
        evidenceNotes: 'Karnataka Private Medical Establishments (KPME) Reg #KPME/BLR/2021/984 verified. Onsite nursing inspection completed.',
        registryLicenseNo: 'KPME/BLR/2021/984',
        verifiedAt: '2026-09-14T10:00:00.000Z',
      },
    ],
  },

  // 2. Bengaluru - Verified 24/7 Hospital
  {
    id: 'fac_blr_002',
    name: 'Manipal Community Health & Emergency Center',
    facilityType: 'HOSPITAL',
    addressLine1: '98 HAL Old Airport Road, Kodihalli',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560017',
    country: 'India',
    latitude: 12.9592,
    longitude: 77.6534,
    phone: '+91 80 2502 4444',
    email: 'emergency@manipalhealth.com',
    websiteUrl: 'https://manipalhealth.com/kodihalli',
    operatingHours: {
      mon: '24 Hours',
      tue: '24 Hours',
      wed: '24 Hours',
      thu: '24 Hours',
      fri: '24 Hours',
      sat: '24 Hours',
      sun: '24 Hours',
    },
    verificationStatus: 'VERIFIED',
    dataSource: 'PARTNER_HEALTH_SYSTEM',
    lastVerifiedAt: '2026-10-01T14:00:00.000Z',
    emergencyCapable: true,
    createdAt: '2026-01-15T09:00:00.000Z',
    updatedAt: '2026-10-01T14:00:00.000Z',
    services: [
      {
        id: 'srv_blr_002_1',
        facilityId: 'fac_blr_002',
        serviceCategory: 'POST_OP_LABS',
        specialtyName: 'STAT Post-Operative Blood Panel & Infection Markers (CBC, CRP, ESR)',
        availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
        requiresPreBooking: false,
        estimatedCostINR: 1100,
        description: '2-hour turnaround for post-surgical infection marker evaluation.',
        createdAt: '2026-01-15T09:00:00.000Z',
        updatedAt: '2026-01-15T09:00:00.000Z',
      },
      {
        id: 'srv_blr_002_2',
        facilityId: 'fac_blr_002',
        serviceCategory: 'IMAGING_XRAY',
        specialtyName: 'Digital X-Ray & Ultrasound Doppler for DVT Screening',
        availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
        requiresPreBooking: false,
        estimatedCostINR: 1850,
        description: 'Rapid deep vein thrombosis and post-orthopedic implant alignment radiography.',
        createdAt: '2026-01-15T09:00:00.000Z',
        updatedAt: '2026-01-15T09:00:00.000Z',
      },
      {
        id: 'srv_blr_002_3',
        facilityId: 'fac_blr_002',
        serviceCategory: 'GENERAL_POST_OP_EVAL',
        specialtyName: 'Attending Surgical Registrar Review & Wound Assessment',
        availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
        requiresPreBooking: true,
        estimatedCostINR: 900,
        description: 'Comprehensive physical evaluation by duty surgical team for patients with intermediate symptoms.',
        createdAt: '2026-01-15T09:00:00.000Z',
        updatedAt: '2026-01-15T09:00:00.000Z',
      },
    ],
    verifications: [
      {
        id: 'ver_blr_002',
        facilityId: 'fac_blr_002',
        status: 'VERIFIED',
        verifierUserId: 'usr_coord_dr_sharma',
        evidenceNotes: 'NABH accredited tertiary network satellite center. Direct clinical MoU active.',
        registryLicenseNo: 'NABH-HOSP-2023-1102',
        verifiedAt: '2026-10-01T14:00:00.000Z',
      },
    ],
  },

  // 3. Bengaluru - Seeded Demonstration Clinic
  {
    id: 'fac_blr_003',
    name: 'Apex Ortho-Rehab & Daycare Clinic [DEMO SEED]',
    facilityType: 'SURGICAL_REHAB',
    addressLine1: '12 Krishna Temple Road, Domlur Layout',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560071',
    country: 'India',
    latitude: 12.9608,
    longitude: 77.6387,
    phone: '+91 80 4115 8890',
    email: 'info@apexrehab-demo.org',
    websiteUrl: 'https://apexrehab-demo.org',
    operatingHours: {
      mon: '09:00 - 18:00',
      tue: '09:00 - 18:00',
      wed: '09:00 - 18:00',
      thu: '09:00 - 18:00',
      fri: '09:00 - 18:00',
      sat: '09:00 - 14:00',
    },
    verificationStatus: 'SEEDED_DEMO',
    dataSource: 'SYNTHETIC_SEED',
    lastVerifiedAt: undefined,
    emergencyCapable: false,
    createdAt: '2026-02-01T10:00:00.000Z',
    updatedAt: '2026-02-01T10:00:00.000Z',
    services: [
      {
        id: 'srv_blr_003_1',
        facilityId: 'fac_blr_003',
        serviceCategory: 'PHYSIOTHERAPY',
        specialtyName: 'Post-Arthroplasty Guided Mobilization & Gait Training',
        availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
        requiresPreBooking: true,
        estimatedCostINR: 700,
        description: 'Physical therapy protocol for post-knee and post-hip surgery recovery.',
        createdAt: '2026-02-01T10:00:00.000Z',
        updatedAt: '2026-02-01T10:00:00.000Z',
      },
      {
        id: 'srv_blr_003_2',
        facilityId: 'fac_blr_003',
        serviceCategory: 'WOUND_CARE',
        specialtyName: 'Orthopedic Incision Cleanse & Sterile Bandage Replacement',
        availableDays: ['MON', 'WED', 'FRI'],
        requiresPreBooking: true,
        estimatedCostINR: 500,
        description: 'Basic dressing service for clean orthopedic surgical cuts.',
        createdAt: '2026-02-01T10:00:00.000Z',
        updatedAt: '2026-02-01T10:00:00.000Z',
      },
    ],
  },

  // 4. Bengaluru - Unverified Clinic
  {
    id: 'fac_blr_004',
    name: 'Koramangala Community Nursing Home',
    facilityType: 'CLINIC',
    addressLine1: '8th Main, 4th Block, Koramangala',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560034',
    country: 'India',
    latitude: 12.9352,
    longitude: 77.6245,
    phone: '+91 80 2553 0981',
    email: undefined,
    websiteUrl: undefined,
    operatingHours: {
      mon: '10:00 - 19:00',
      tue: '10:00 - 19:00',
      wed: '10:00 - 19:00',
      thu: '10:00 - 19:00',
      fri: '10:00 - 19:00',
    },
    verificationStatus: 'UNVERIFIED',
    dataSource: 'COMMUNITY_SUBMISSION',
    lastVerifiedAt: undefined,
    emergencyCapable: false,
    createdAt: '2026-03-01T11:00:00.000Z',
    updatedAt: '2026-03-01T11:00:00.000Z',
    services: [
      {
        id: 'srv_blr_004_1',
        facilityId: 'fac_blr_004',
        serviceCategory: 'SUTURE_REMOVAL',
        specialtyName: 'General Nurse Suture Removal',
        availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        requiresPreBooking: false,
        estimatedCostINR: 350,
        description: 'Walk-in suture excision and betadine dressing.',
        createdAt: '2026-03-01T11:00:00.000Z',
        updatedAt: '2026-03-01T11:00:00.000Z',
      },
    ],
  },

  // 5. Mumbai - Verified Specialty Diagnostic Center
  {
    id: 'fac_mum_001',
    name: 'Metropolis Post-Op Diagnostic & Care Hub',
    facilityType: 'DIAGNOSTIC_CENTER',
    addressLine1: 'Bandra Kurla Complex, Bandra East',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400051',
    country: 'India',
    latitude: 19.0657,
    longitude: 72.8687,
    phone: '+91 22 6155 7700',
    email: 'bkc@metropolis-health.in',
    websiteUrl: 'https://metropolis-health.in',
    operatingHours: {
      mon: '07:00 - 21:00',
      tue: '07:00 - 21:00',
      wed: '07:00 - 21:00',
      thu: '07:00 - 21:00',
      fri: '07:00 - 21:00',
      sat: '07:00 - 19:00',
      sun: '08:00 - 13:00',
    },
    verificationStatus: 'VERIFIED',
    dataSource: 'OFFICIAL_REGISTRY',
    lastVerifiedAt: '2026-08-20T12:00:00.000Z',
    emergencyCapable: false,
    createdAt: '2026-01-20T08:00:00.000Z',
    updatedAt: '2026-08-20T12:00:00.000Z',
    services: [
      {
        id: 'srv_mum_001_1',
        facilityId: 'fac_mum_001',
        serviceCategory: 'POST_OP_LABS',
        specialtyName: 'Complete Metabolic Panel, Electrolytes & Coagulation Profile (PT/INR)',
        availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
        requiresPreBooking: false,
        estimatedCostINR: 1350,
        description: 'Crucial for post-cardiac and post-vascular surgery anticoagulation monitoring.',
        createdAt: '2026-01-20T08:00:00.000Z',
        updatedAt: '2026-01-20T08:00:00.000Z',
      },
      {
        id: 'srv_mum_001_2',
        facilityId: 'fac_mum_001',
        serviceCategory: 'WOUND_CARE',
        specialtyName: 'Sterile Wound Swab Culture & Sensitivity Testing',
        availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
        requiresPreBooking: true,
        estimatedCostINR: 800,
        description: 'Microbiology culture for suspected surgical site infections.',
        createdAt: '2026-01-20T08:00:00.000Z',
        updatedAt: '2026-01-20T08:00:00.000Z',
      },
    ],
    verifications: [
      {
        id: 'ver_mum_001',
        facilityId: 'fac_mum_001',
        status: 'VERIFIED',
        verifierUserId: 'usr_coord_dr_deshmukh',
        evidenceNotes: 'NABL Certificate #MC-2041 valid through 2027. Routine lab quality audit checked.',
        registryLicenseNo: 'NABL-MC-2041',
        verifiedAt: '2026-08-20T12:00:00.000Z',
      },
    ],
  },

  // 6. Mumbai - Seeded General Clinic
  {
    id: 'fac_mum_002',
    name: 'Andheri West PolyClinic & Wound Dressing Unit [DEMO SEED]',
    facilityType: 'CLINIC',
    addressLine1: 'Link Road, Near Infinity Mall, Andheri West',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400053',
    country: 'India',
    latitude: 19.1412,
    longitude: 72.8311,
    phone: '+91 22 2630 4455',
    email: 'care@andheridressing-demo.in',
    websiteUrl: 'https://andheridressing-demo.in',
    operatingHours: {
      mon: '09:00 - 20:00',
      tue: '09:00 - 20:00',
      wed: '09:00 - 20:00',
      thu: '09:00 - 20:00',
      fri: '09:00 - 20:00',
      sat: '09:00 - 18:00',
    },
    verificationStatus: 'SEEDED_DEMO',
    dataSource: 'SYNTHETIC_SEED',
    lastVerifiedAt: undefined,
    emergencyCapable: false,
    createdAt: '2026-02-15T09:00:00.000Z',
    updatedAt: '2026-02-15T09:00:00.000Z',
    services: [
      {
        id: 'srv_mum_002_1',
        facilityId: 'fac_mum_002',
        serviceCategory: 'WOUND_CARE',
        specialtyName: 'Daily Wound Cleansing & Silver Sulfadiazine Dressing',
        availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
        requiresPreBooking: false,
        estimatedCostINR: 400,
        description: 'Routine post-surgical bandage replacement and wound evaluation.',
        createdAt: '2026-02-15T09:00:00.000Z',
        updatedAt: '2026-02-15T09:00:00.000Z',
      },
      {
        id: 'srv_mum_002_2',
        facilityId: 'fac_mum_002',
        serviceCategory: 'SUTURE_REMOVAL',
        specialtyName: 'Surgical Clip / Staple Extraction',
        availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        requiresPreBooking: true,
        estimatedCostINR: 350,
        description: 'Standard surgical clip removal with steri-strip support.',
        createdAt: '2026-02-15T09:00:00.000Z',
        updatedAt: '2026-02-15T09:00:00.000Z',
      },
    ],
  },

  // 7. Delhi NCR - Verified Hospital & Trauma Center
  {
    id: 'fac_del_001',
    name: 'Max Smart Recovery & Critical Outreach Center',
    facilityType: 'HOSPITAL',
    addressLine1: 'Press Enclave Marg, Saket',
    city: 'New Delhi',
    state: 'Delhi',
    postalCode: '110017',
    country: 'India',
    latitude: 28.5284,
    longitude: 77.2144,
    phone: '+91 11 2651 5050',
    email: 'saket.postop@maxhealthcare.com',
    websiteUrl: 'https://maxhealthcare.com/saket',
    operatingHours: {
      mon: '24 Hours',
      tue: '24 Hours',
      wed: '24 Hours',
      thu: '24 Hours',
      fri: '24 Hours',
      sat: '24 Hours',
      sun: '24 Hours',
    },
    verificationStatus: 'VERIFIED',
    dataSource: 'PARTNER_HEALTH_SYSTEM',
    lastVerifiedAt: '2026-09-01T15:00:00.000Z',
    emergencyCapable: true,
    createdAt: '2026-01-05T07:00:00.000Z',
    updatedAt: '2026-09-01T15:00:00.000Z',
    services: [
      {
        id: 'srv_del_001_1',
        facilityId: 'fac_del_001',
        serviceCategory: 'GENERAL_POST_OP_EVAL',
        specialtyName: 'Senior Surgeon Post-Discharge Evaluation & Complication Triage',
        availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
        requiresPreBooking: true,
        estimatedCostINR: 1200,
        description: 'Comprehensive physical examination for surgical flap/incision viability.',
        createdAt: '2026-01-05T07:00:00.000Z',
        updatedAt: '2026-01-05T07:00:00.000Z',
      },
      {
        id: 'srv_del_001_2',
        facilityId: 'fac_del_001',
        serviceCategory: 'DRAIN_MANAGEMENT',
        specialtyName: 'Complex T-Tube, Chest Tube & Sump Drain Servicing',
        availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
        requiresPreBooking: false,
        estimatedCostINR: 950,
        description: 'Dedicated post-surgical drain clearance and fluid microbiology.',
        createdAt: '2026-01-05T07:00:00.000Z',
        updatedAt: '2026-01-05T07:00:00.000Z',
      },
    ],
    verifications: [
      {
        id: 'ver_del_001',
        facilityId: 'fac_del_001',
        status: 'VERIFIED',
        verifierUserId: 'usr_coord_dr_sharma',
        evidenceNotes: 'NABH and JCI verified network facility. 24/7 Surgical ICU operational.',
        registryLicenseNo: 'DEL-JCI-HOSP-2022-771',
        verifiedAt: '2026-09-01T15:00:00.000Z',
      },
    ],
  },

  // 8. Chennai - Verified Wound & Physio Care
  {
    id: 'fac_che_001',
    name: 'Apollo Outreach & Surgical Wound Unit',
    facilityType: 'WOUND_CARE_CENTER',
    addressLine1: 'Greams Lane, Thousand Lights',
    city: 'Chennai',
    state: 'Tamil Nadu',
    postalCode: '600006',
    country: 'India',
    latitude: 13.0569,
    longitude: 80.2525,
    phone: '+91 44 2829 0200',
    email: 'woundoutreach@apollohealth.org',
    websiteUrl: 'https://apollohealth.org/thousand-lights',
    operatingHours: {
      mon: '08:00 - 20:00',
      tue: '08:00 - 20:00',
      wed: '08:00 - 20:00',
      thu: '08:00 - 20:00',
      fri: '08:00 - 20:00',
      sat: '08:00 - 18:00',
    },
    verificationStatus: 'VERIFIED',
    dataSource: 'PARTNER_HEALTH_SYSTEM',
    lastVerifiedAt: '2026-07-10T10:00:00.000Z',
    emergencyCapable: false,
    createdAt: '2026-01-08T09:00:00.000Z',
    updatedAt: '2026-07-10T10:00:00.000Z',
    services: [
      {
        id: 'srv_che_001_1',
        facilityId: 'fac_che_001',
        serviceCategory: 'WOUND_CARE',
        specialtyName: 'Hyperbaric & Advanced Negative Pressure Wound Therapy',
        availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
        requiresPreBooking: true,
        estimatedCostINR: 1500,
        description: 'Specialized for compromised wound healing, diabetic foot ulcers, and graft sites.',
        createdAt: '2026-01-08T09:00:00.000Z',
        updatedAt: '2026-01-08T09:00:00.000Z',
      },
      {
        id: 'srv_che_001_2',
        facilityId: 'fac_che_001',
        serviceCategory: 'PHYSIOTHERAPY',
        specialtyName: 'Post-Spinal & Post-Laparotomy Respiratory Rehabilitation',
        availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        requiresPreBooking: true,
        estimatedCostINR: 850,
        description: 'Incentive spirometry supervision and early core mobilization.',
        createdAt: '2026-01-08T09:00:00.000Z',
        updatedAt: '2026-01-08T09:00:00.000Z',
      },
    ],
    verifications: [
      {
        id: 'ver_che_001',
        facilityId: 'fac_che_001',
        status: 'VERIFIED',
        verifierUserId: 'usr_coord_dr_subramanian',
        evidenceNotes: 'Tamil Nadu Private Clinical Establishment Act verified (TN-PCEA-CHE-1044).',
        registryLicenseNo: 'TN-PCEA-CHE-1044',
        verifiedAt: '2026-07-10T10:00:00.000Z',
      },
    ],
  },

  // 9. Bengaluru - Unmapped Facility (Demonstrates missing coordinates handling: accessible in list, not plotted on map)
  {
    id: 'fac_blr_005',
    name: 'Jayanagar Post-Op Community Nursing Post [DEMO - UNMAPPED]',
    facilityType: 'CLINIC',
    addressLine1: '32 4th Block, Near Central Library, Jayanagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560011',
    country: 'India',
    latitude: undefined, // Coordinates intentionally undefined for edge-case demonstration
    longitude: undefined,
    phone: '+91 80 2664 1234',
    email: 'jayanagar.postop@communityhealth-demo.org',
    websiteUrl: undefined,
    operatingHours: {
      mon: '09:00 - 17:00',
      tue: '09:00 - 17:00',
      wed: '09:00 - 17:00',
      thu: '09:00 - 17:00',
      fri: '09:00 - 17:00',
    },
    verificationStatus: 'UNVERIFIED',
    dataSource: 'COMMUNITY_SUBMISSION',
    lastVerifiedAt: undefined,
    emergencyCapable: false,
    createdAt: '2026-03-10T11:00:00.000Z',
    updatedAt: '2026-03-10T11:00:00.000Z',
    services: [
      {
        id: 'srv_blr_005_1',
        facilityId: 'fac_blr_005',
        serviceCategory: 'WOUND_CARE',
        specialtyName: 'Community Nurse Dressing and Incision Cleanse',
        availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        requiresPreBooking: false,
        estimatedCostINR: 300,
        description: 'Walk-in nursing center for basic post-op dressing changes.',
        createdAt: '2026-03-10T11:00:00.000Z',
        updatedAt: '2026-03-10T11:00:00.000Z',
      },
    ],
  },
];

// Initial seeded referrals
const INITIAL_REFERRALS: CareReferralItem[] = [
  {
    id: 'ref_seed_001',
    patientId: 'pat_synt_101',
    facilityId: 'fac_blr_001',
    requestedServices: ['WOUND_CARE', 'SUTURE_REMOVAL'],
    referralStatus: 'DISPATCHED_TO_LOCAL',
    urgencyLevel: 'ROUTINE',
    clinicalSummary: 'Post-laparoscopic cholecystectomy Day 9. Ports healing appropriately. Suture removal and wound inspection requested.',
    attendingPhysicianId: 'dr_raj_operating_surgeon',
    approvedAt: '2026-10-15T09:30:00.000Z',
    scheduledDate: '2026-10-18T10:00:00.000Z',
    createdAt: '2026-10-15T09:00:00.000Z',
    updatedAt: '2026-10-15T09:30:00.000Z',
    facility: {
      name: 'St. Jude Post-Surgical Recovery & Wound Center',
      city: 'Bengaluru',
      phone: '+91 80 2520 1144',
      emergencyCapable: false,
    },
  },
];

// ----------------------------------------------------------------------------
// SINGLETON IN-MEMORY REPOSITORY
// ----------------------------------------------------------------------------

class ProviderRepository {
  private facilities: HealthcareFacilityItem[] = [...INITIAL_FACILITIES];
  private referrals: CareReferralItem[] = [...INITIAL_REFERRALS];

  /**
   * Search and filter facilities with spatial proximity calculations.
   */
  public searchFacilities(params: ProviderSearchParams): PaginatedResult<HealthcareFacilityItem> {
    const {
      searchTerm,
      city,
      state,
      postalCode,
      latitude,
      longitude,
      radiusKm = 50,
      services,
      facilityType,
      verificationStatus,
      emergencyOnly,
      page = 1,
      limit = 10,
      sortBy = 'distance',
    } = params;

    const hasCenter =
      latitude !== undefined &&
      longitude !== undefined &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude);

    // 1. Exclude inactive facilities by default and compute distance
    let results = this.facilities
      .filter((fac) => fac.isActive !== false)
      .map((fac) => {
        let distanceKm: number | undefined = undefined;
        if (
          hasCenter &&
          fac.latitude !== undefined &&
          fac.longitude !== undefined &&
          Number.isFinite(fac.latitude) &&
          Number.isFinite(fac.longitude)
        ) {
          distanceKm = calculateHaversineDistanceKm(
            latitude,
            longitude,
            fac.latitude,
            fac.longitude
          );
        }
        return {
          ...fac,
          distanceKm,
        };
      });

    // 2. Filter by search term with safe nil-checks
    if (searchTerm && searchTerm.trim().length > 0) {
      const q = searchTerm.toLowerCase().trim();
      results = results.filter(
        (f) =>
          (f.name && f.name.toLowerCase().includes(q)) ||
          (f.addressLine1 && f.addressLine1.toLowerCase().includes(q)) ||
          (f.city && f.city.toLowerCase().includes(q)) ||
          (f.postalCode && f.postalCode.includes(q)) ||
          (f.services || []).some(
            (s) =>
              (s.specialtyName && s.specialtyName.toLowerCase().includes(q)) ||
              (s.serviceCategory && s.serviceCategory.toLowerCase().includes(q))
          )
      );
    }

    // 3. Filter by City
    if (city && city.trim().length > 0) {
      const c = city.toLowerCase().trim();
      results = results.filter((f) => f.city && f.city.toLowerCase().includes(c));
    }

    // 4. Filter by State
    if (state && state.trim().length > 0) {
      const st = state.toLowerCase().trim();
      results = results.filter((f) => f.state && f.state.toLowerCase().includes(st));
    }

    // 5. Filter by Postal Code
    if (postalCode && postalCode.trim().length > 0) {
      results = results.filter((f) => f.postalCode && f.postalCode.startsWith(postalCode.trim()));
    }

    // 6. Filter by Radius (only if user provided center coordinates)
    if (hasCenter && radiusKm) {
      results = results.filter((f) => f.distanceKm !== undefined && f.distanceKm <= radiusKm);
    }

    // 7. Filter by Services (matching ANY requested service)
    if (services && services.length > 0) {
      results = results.filter((f) =>
        (f.services || []).some((s) => services.includes(s.serviceCategory))
      );
    }

    // 8. Filter by Facility Type
    if (facilityType && facilityType.length > 0) {
      results = results.filter((f) => facilityType.includes(f.facilityType));
    }

    // 9. Filter by Verification Status
    if (verificationStatus) {
      results = results.filter((f) => f.verificationStatus === verificationStatus);
    }

    // 10. Filter by Emergency Capable
    if (emergencyOnly) {
      results = results.filter((f) => f.emergencyCapable);
    }

    // 11. Stable Sort Results
    results.sort((a, b) => {
      if (sortBy === 'distance' && hasCenter) {
        if (a.distanceKm === undefined && b.distanceKm === undefined) return 0;
        if (a.distanceKm === undefined) return 1;
        if (b.distanceKm === undefined) return -1;
        return a.distanceKm - b.distanceKm;
      }
      if (sortBy === 'type') {
        return (a.facilityType || '').localeCompare(b.facilityType || '');
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    // 12. Robust Pagination (Guards against NaN, non-integers, and negatives)
    const totalCount = results.length;
    const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page!)) : 1;
    const safeLimit = Number.isFinite(limit) ? Math.min(50, Math.max(1, Math.floor(limit!))) : 10;
    const totalPages = Math.ceil(totalCount / safeLimit) || 1;
    const startIndex = (safePage - 1) * safeLimit;
    const paginatedItems = results.slice(startIndex, startIndex + safeLimit);

    return {
      data: paginatedItems,
      meta: {
        totalCount,
        page: safePage,
        limit: safeLimit,
        totalPages,
        hasMore: safePage < totalPages,
        appliedFilters: {
          searchTerm,
          city,
          radiusKm: hasCenter ? radiusKm : undefined,
          services: services?.map(String),
          facilityType: facilityType?.map(String),
          verificationStatus,
          centerCoordinates: hasCenter ? { lat: latitude, lng: longitude } : undefined,
        },
      },
    };
  }

  /**
   * Get single facility by ID
   */
  public getFacilityById(id: string): HealthcareFacilityItem | null {
    const found = this.facilities.find((f) => f.id === id);
    return found ? { ...found } : null;
  }

  /**
   * Create a new facility (Requires Coordinator / Admin Role)
   */
  public createFacility(
    data: Omit<HealthcareFacilityItem, 'id' | 'createdAt' | 'updatedAt' | 'services'> & {
      services?: Omit<FacilityServiceItem, 'id' | 'facilityId' | 'createdAt' | 'updatedAt'>[];
    }
  ): HealthcareFacilityItem {
    const id = `fac_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const createdServices: FacilityServiceItem[] = (data.services || []).map((srv, idx) => ({
      ...srv,
      id: `srv_${id}_${idx + 1}`,
      facilityId: id,
      createdAt: now,
      updatedAt: now,
    }));

    const newFacility: HealthcareFacilityItem = {
      ...data,
      id,
      services: createdServices,
      verificationStatus: data.verificationStatus || 'PENDING_REVIEW',
      dataSource: data.dataSource || 'COMMUNITY_SUBMISSION',
      createdAt: now,
      updatedAt: now,
    };

    this.facilities.unshift(newFacility);
    return { ...newFacility };
  }

  /**
   * Update an existing facility
   */
  public updateFacility(
    id: string,
    updates: Partial<Omit<HealthcareFacilityItem, 'id' | 'createdAt' | 'updatedAt' | 'services'>>
  ): HealthcareFacilityItem | null {
    const index = this.facilities.findIndex((f) => f.id === id);
    if (index === -1) return null;

    const now = new Date().toISOString();
    const updated: HealthcareFacilityItem = {
      ...this.facilities[index],
      ...updates,
      updatedAt: now,
    };

    this.facilities[index] = updated;
    return { ...updated };
  }

  /**
   * Deactivate a facility (soft-delete preserving clinical referral references)
   */
  public deactivateFacility(id: string): boolean {
    const facility = this.facilities.find((f) => f.id === id);
    if (!facility) return false;
    facility.isActive = false;
    facility.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Record a formal verification action (Admin only)
   */
  public recordVerification(
    facilityId: string,
    data: {
      status: VerificationStatus;
      evidenceNotes: string;
      registryLicenseNo?: string;
      verifierUserId?: string;
    }
  ): HealthcareFacilityItem | null {
    const facility = this.facilities.find((f) => f.id === facilityId);
    if (!facility) return null;

    const now = new Date().toISOString();
    const verificationRecord: VerificationRecordItem = {
      id: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      facilityId,
      status: data.status,
      evidenceNotes: data.evidenceNotes,
      registryLicenseNo: data.registryLicenseNo,
      verifierUserId: data.verifierUserId || 'coord_demo_admin',
      verifiedAt: now,
    };

    facility.verificationStatus = data.status;
    facility.lastVerifiedAt = data.status === 'VERIFIED' ? now : undefined;
    facility.verifications = [...(facility.verifications || []), verificationRecord];
    facility.updatedAt = now;

    return { ...facility };
  }

  /**
   * Create a Care Referral
   */
  public createReferral(data: {
    patientId: string;
    facilityId: string;
    requestedServices: ServiceCategory[];
    urgencyLevel: 'ROUTINE' | 'PRIORITY' | 'URGENT';
    clinicalSummary: string;
    attendingPhysicianId?: string;
    scheduledDate?: string;
  }): CareReferralItem | null {
    const facility = this.getFacilityById(data.facilityId);
    if (!facility) return null;

    const now = new Date().toISOString();
    const newReferral: CareReferralItem = {
      id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      patientId: data.patientId,
      facilityId: data.facilityId,
      requestedServices: data.requestedServices,
      referralStatus: 'DISPATCHED_TO_LOCAL',
      urgencyLevel: data.urgencyLevel,
      clinicalSummary: data.clinicalSummary,
      attendingPhysicianId: data.attendingPhysicianId || 'dr_attending_coordinator',
      approvedAt: now,
      scheduledDate: data.scheduledDate,
      createdAt: now,
      updatedAt: now,
      facility: {
        name: facility.name,
        city: facility.city,
        phone: facility.phone,
        emergencyCapable: facility.emergencyCapable,
      },
    };

    this.referrals.unshift(newReferral);
    return { ...newReferral };
  }

  /**
   * List all Care Referrals
   */
  public listReferrals(): CareReferralItem[] {
    return [...this.referrals];
  }
}

// Global singleton instance
declare global {
  var __teleFollowUpProviderRepo: ProviderRepository | undefined;
}

export const providerRepository =
  globalThis.__teleFollowUpProviderRepo || new ProviderRepository();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__teleFollowUpProviderRepo = providerRepository;
}
