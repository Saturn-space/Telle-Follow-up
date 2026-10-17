// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - MEMBER 3 TYPES & CONTRACTS
// Healthcare Provider Directory & Local Care Discovery
// ============================================================================

export type FacilityType =
  | 'HOSPITAL'
  | 'CLINIC'
  | 'DIAGNOSTIC_CENTER'
  | 'WOUND_CARE_CENTER'
  | 'SURGICAL_REHAB';

export type VerificationStatus =
  | 'SEEDED_DEMO'
  | 'UNVERIFIED'
  | 'PENDING_REVIEW'
  | 'VERIFIED';

export type ProviderDataSource =
  | 'SYNTHETIC_SEED'
  | 'COMMUNITY_SUBMISSION'
  | 'OFFICIAL_REGISTRY'
  | 'PARTNER_HEALTH_SYSTEM';

export type ServiceCategory =
  | 'WOUND_CARE'
  | 'SUTURE_REMOVAL'
  | 'DRAIN_MANAGEMENT'
  | 'POST_OP_LABS'
  | 'IMAGING_XRAY'
  | 'PHYSIOTHERAPY'
  | 'GENERAL_POST_OP_EVAL';

export type ReferralStatus =
  | 'DRAFT'
  | 'PENDING_CLINICIAN_APPROVAL'
  | 'DISPATCHED_TO_LOCAL'
  | 'ACCEPTED_BY_LOCAL'
  | 'COMPLETED'
  | 'DECLINED'
  | 'CANCELLED';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface OperatingHours {
  [day: string]: string; // e.g. "mon": "08:00 - 18:00"
}

export interface FacilityServiceItem {
  id: string;
  facilityId: string;
  serviceCategory: ServiceCategory;
  specialtyName: string;
  availableDays?: string[];
  requiresPreBooking: boolean;
  estimatedCostINR?: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationRecordItem {
  id: string;
  facilityId: string;
  status: VerificationStatus;
  verifierUserId?: string;
  evidenceNotes: string;
  registryLicenseNo?: string;
  verifiedAt: string;
}

export interface HealthcareFacilityItem {
  id: string;
  name: string;
  facilityType: FacilityType;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  operatingHours?: OperatingHours;
  verificationStatus: VerificationStatus;
  dataSource: ProviderDataSource;
  lastVerifiedAt?: string;
  emergencyCapable: boolean;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;

  // Joined relations
  services: FacilityServiceItem[];
  verifications?: VerificationRecordItem[];
  distanceKm?: number; // Dynamically computed if search coordinates are provided
}

export interface CareReferralItem {
  id: string;
  patientId: string;
  facilityId: string;
  requestedServices: ServiceCategory[];
  referralStatus: ReferralStatus;
  urgencyLevel: 'ROUTINE' | 'PRIORITY' | 'URGENT';
  clinicalSummary: string;
  attendingPhysicianId?: string;
  approvedAt?: string;
  scheduledDate?: string;
  completionNotes?: string;
  createdAt: string;
  updatedAt: string;

  // Joined facility details
  facility?: {
    name: string;
    city: string;
    phone?: string;
    emergencyCapable: boolean;
  };
}

// ----------------------------------------------------------------------------
// QUERY & FILTER PARAMETERS
// ----------------------------------------------------------------------------

export interface ProviderSearchParams {
  searchTerm?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  services?: ServiceCategory[];
  facilityType?: FacilityType[];
  verificationStatus?: VerificationStatus;
  emergencyOnly?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'distance' | 'name' | 'type';
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
    appliedFilters: {
      searchTerm?: string;
      city?: string;
      radiusKm?: number;
      services?: string[];
      facilityType?: string[];
      verificationStatus?: string;
      centerCoordinates?: { lat: number; lng: number };
    };
  };
}

// ----------------------------------------------------------------------------
// CROSS-MEMBER INTEGRATION CONTRACTS
// ----------------------------------------------------------------------------

/** Contract provided by Member 1 (Patient Intake & Location) to Member 3 */
export interface PatientLocationContext {
  patientId: string;
  patientName: string;
  surgeryType: string;
  dischargeDate: string;
  city: string;
  state: string;
  postalCode: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/** Contract provided by Member 2 (AI Risk Engine) to Member 3 */
export interface RiskGatingContext {
  riskTier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  localCareEligible: boolean;
  requiredCapabilities: ServiceCategory[];
  clinicalRationale: string;
  emergencyEscalationRequired: boolean;
}

/** Contract provided by Member 3 to Member 4 (Travel Optimization) */
export interface FacilityLocationDTO {
  facilityId: string;
  facilityName: string;
  facilityType: FacilityType;
  coordinates: {
    latitude: number;
    longitude: number;
  } | null;
  hasValidCoordinates?: boolean;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  emergencyCapable: boolean;
  servicesAvailable: ServiceCategory[];
}

/** Contract provided by Member 3 to Member 5 (Teleconsultation & Scheduling) */
export interface ReferralDispatchDTO {
  referralId: string;
  patientId: string;
  facilityId: string;
  facilityName: string;
  requestedServices: ServiceCategory[];
  urgencyLevel: 'ROUTINE' | 'PRIORITY' | 'URGENT';
  clinicalSummary: string;
  scheduledDate?: string;
}
