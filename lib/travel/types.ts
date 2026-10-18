import { z } from 'zod';

// ========================================================
// MEMBER 4: TRAVEL OPTIMIZATION & ESCALATION TYPE CONTRACTS
// ========================================================

/**
 * Supported transport modes for follow-up travel.
 */
export type TransportMode = 'DRIVING' | 'PUBLIC_TRANSIT' | 'TAXI';

/**
 * Routing estimation source transparency tag.
 */
export type RouteSourceType = 
  | 'OSRM_LIVE' 
  | 'OSRM_CACHED'
  | 'ESTIMATED_HAVERSINE_ROAD_FACTOR' 
  | 'UNAVAILABLE';

/**
 * Circuit breaker states for external geospatial routing.
 */
export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Health check status.
 */
export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'CRITICAL';

/**
 * Cache operational metrics.
 */
export interface RouteCacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRatio: number;
}

/**
 * Anonymized, zero-PHI operational telemetry.
 */
export interface TravelTelemetryMetrics {
  totalComparisons: number;
  completedComparisons: number;
  escalatedComparisons: number;
  totalDistanceSavedKm: number;
  totalTimeSavedMins: number;
  routeSources: {
    osrmLive: number;
    osrmCached: number;
    haversineFallback: number;
  };
  circuitBreaker: {
    state: CircuitBreakerState;
    failures: number;
    lastTripTime?: string;
  };
  cache: RouteCacheStats;
}

/**
 * Clinical Urgency levels ingested from Member 2's AI Risk Assessment module.
 */
export type ClinicalUrgencyLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'UNASSESSED_OR_MISSING';

/**
 * Follow-up recommendation category.
 */
export type RecommendationCategory = 
  | 'LOCAL_VERIFIED_CLINIC' 
  | 'ORIGINAL_SURGICAL_HOSPITAL' 
  | 'TELECONSULTATION_HYBRID' 
  | 'EMERGENCY_ESCALATION';

/**
 * Coordinates with latitude and longitude.
 */
export interface GeoLocation {
  latitude: number;
  longitude: number;
  label: string;
  district?: string;
  state?: string;
}

/**
 * Contract from Member 1: Patient Context
 */
export interface PatientTravelContext {
  patientId: string;
  name: string;
  surgeryType: string;
  daysPostOp: number;
  primaryHospitalId: string;
  primaryHospitalName: string;
  origin: GeoLocation;
  mobilityConstraint?: 'FULL_MOBILITY' | 'RESTRICTED_SITTING' | 'STRETCHER_WHEELCHAIR';
}

/**
 * Contract from Member 2: Clinical Risk & Escalation State
 */
export interface ClinicalRiskContext {
  assessmentId?: string;
  urgencyLevel: ClinicalUrgencyLevel;
  isEscalated: boolean;
  redFlags: string[];
  assessmentTimestamp?: string;
  clinicianReviewed: boolean;
  isMissing?: boolean;
  isStale?: boolean;
  notes?: string;
}

/**
 * Contract from Member 3: Healthcare Provider from Directory
 */
export interface CandidateProvider {
  providerId: string;
  name: string;
  facilityType: 'HOSPITAL' | 'SURGICAL_CLINIC' | 'DIAGNOSTIC_CENTER' | 'WOUND_CARE_CLINIC';
  location: GeoLocation;
  isVerified: boolean;
  verificationBadge: 'STATE_HEALTH_AUTHORITY' | 'HOSPITAL_AFFILIATE' | 'COMMUNITY_PARTNER' | 'UNVERIFIED';
  supportedServices: string[]; // e.g. ["POST_OP_WOUND_CARE", "SUTURE_REMOVAL", "DRAIN_REMOVAL", "DOPPLER_ULTRASOUND"]
  contactPhone: string;
  operatingHours: string;
}

/**
 * Cost calculation breakdown and transparency details.
 */
export interface TravelCostEstimate {
  estimatedCost: number;
  currency: string;
  transportMode: TransportMode;
  ratePerKm: number;
  roundtripDistanceKm: number;
  incidentalLodgingCost: number;
  assumptions: string[];
  isEstimateOnly: true;
}

/**
 * Route calculation detail between two points.
 */
export interface RouteResult {
  origin: GeoLocation;
  destination: GeoLocation;
  distanceKm: number;
  durationMins: number;
  routeSource: RouteSourceType;
  geometryPolyline?: [number, number][]; // Array of [lat, lng]
  sourceAttribution: string;
  calculatedAt: string;
  warning?: string;
}

/**
 * Evaluation of a candidate destination option.
 */
export interface DestinationComparisonOption {
  providerId: string;
  providerName: string;
  isOriginalHospital: boolean;
  location: GeoLocation;
  isVerified: boolean;
  verificationBadge: string;
  
  // Clinical service eligibility
  isEligible: boolean;
  ineligibilityReason?: string;
  matchedServices: string[];
  
  // Geospatial route results
  route: RouteResult;
  
  // Cost modeling
  costEstimate: TravelCostEstimate | null;
  costMissingReason?: string;
  
  // Recommendation scoring and ranking
  rankOrder: number;
  isRecommended: boolean;
  scoreBreakdown: {
    clinicalCapabilityScore: number; // 0-100
    travelBurdenScore: number;       // 0-100 (lower distance = higher score)
    verificationScore: number;       // 0-100
  };
}

/**
 * Complete Travel Comparison Result (Returned by API and Persisted).
 */
export interface TravelComparisonResult {
  comparisonId: string;
  patientId: string;
  patientName: string;
  surgeryType: string;
  createdAt: string;
  
  // Input parameters
  origin: GeoLocation;
  requiredService: string;
  transportMode: TransportMode;
  
  // Clinical safety status (Member 2)
  clinicalRisk: ClinicalRiskContext;
  
  // Emergency Escalation override
  isEscalated: boolean;
  escalationReason?: string;
  emergencyActionRequired?: string;
  
  // Recommended outcome
  recommendedCategory: RecommendationCategory;
  recommendedProviderId?: string;
  recommendationRationale: string;
  potentialTravelSavingsKm?: number;
  potentialDurationSavingsMins?: number;
  
  // All evaluated destinations
  candidates: DestinationComparisonOption[];
  
  // Status and metadata
  status: 'COMPLETED' | 'ESCALATED' | 'FAILED';
  meta: {
    routingServiceStatus: string;
    notice: string;
  };
}

/**
 * Escalation Event record.
 */
export interface EscalationEvent {
  eventId: string;
  comparisonId: string;
  patientId: string;
  triggeredAt: string;
  reason: string;
  urgencyLevel: ClinicalUrgencyLevel;
  redFlags: string[];
  recommendedAction: string;
  nearestEmergencyFacility?: {
    name: string;
    distanceKm: number;
    phone: string;
  };
}

// ========================================================
// ZOD VALIDATION SCHEMAS
// ========================================================

export const GeoLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  label: z.string().min(1, 'Location label is required'),
  district: z.string().optional(),
  state: z.string().optional(),
});

export const TravelComparisonRequestSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  requiredService: z.string().min(1, 'Required service code is required'),
  transportMode: z.enum(['DRIVING', 'PUBLIC_TRANSIT', 'TAXI']).default('DRIVING'),
}).strict();

/** Inputs used only by the legacy fixture-based travel unit service. */
export type TravelComparisonServiceRequest = z.infer<typeof TravelComparisonRequestSchema> & {
  origin: GeoLocation;
  customCandidateIds?: string[];
  simulateClinicalUrgency?: ClinicalUrgencyLevel;
};

export type TravelComparisonRequest = z.infer<typeof TravelComparisonRequestSchema>;

export const EscalationEventRequestSchema = z.object({
  comparisonId: z.string().min(1, 'Comparison ID is required'),
  patientId: z.string().min(1, 'Patient ID is required'),
  reason: z.string().min(1, 'Escalation reason is required'),
  urgencyLevel: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL', 'UNASSESSED_OR_MISSING']).default('CRITICAL'),
  redFlags: z.array(z.string()).default([]),
});

export type EscalationEventRequest = z.infer<typeof EscalationEventRequestSchema>;
