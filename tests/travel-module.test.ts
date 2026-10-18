import { describe, it, expect } from 'vitest';
import {
  calculateHaversineDistanceKm,
  calculateRoute,
  getRouteCacheStats,
  clearRouteCache,
  getCircuitBreakerStatus,
  resetCircuitBreaker,
  tripCircuitBreakerForTesting,
} from '../lib/travel/routing-adapter';
import { calculateTravelCost, DEFAULT_RATES_PER_KM } from '../lib/travel/cost-calculator';
import { executeTravelComparison } from '../lib/travel/comparison-service';
import { travelTelemetry } from '../lib/travel/telemetry';
import {
  GeoLocationSchema,
  TravelComparisonRequestSchema,
  EscalationEventRequestSchema,
} from '../lib/travel/types';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, testName: string, failureMessage?: string) {
  if (condition) {
    results.push({ name: testName, passed: true });
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    results.push({ name: testName, passed: false, error: failureMessage || 'Assertion failed' });
    console.error(`  ✗ FAIL: ${testName} - ${failureMessage}`);
  }
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('MEMBER 4: TRAVEL OPTIMIZATION & ESCALATION TEST SUITE');
  console.log('======================================================\n');

  // ----------------------------------------------------------------
  // Group 1: Coordinate and Location Validation Tests
  // ----------------------------------------------------------------
  console.log('--- Group 1: Coordinate and Location Validation ---');
  
  const validLocation = {
    latitude: 26.9124,
    longitude: 75.7873,
    label: 'Jaipur, Rajasthan',
  };
  const validParse = GeoLocationSchema.safeParse(validLocation);
  assert(validParse.success, 'Valid coordinates pass Zod schema validation');

  const invalidLat = { latitude: 95.0, longitude: 75.0, label: 'Invalid Lat' };
  const invalidLatParse = GeoLocationSchema.safeParse(invalidLat);
  assert(!invalidLatParse.success, 'Out-of-bounds latitude (>90) correctly rejected');

  const invalidLon = { latitude: 20.0, longitude: -195.0, label: 'Invalid Lon' };
  const invalidLonParse = GeoLocationSchema.safeParse(invalidLon);
  assert(!invalidLonParse.success, 'Out-of-bounds longitude (<-180) correctly rejected');

  // ----------------------------------------------------------------
  // Group 2: Haversine & Routing Distance Calculations
  // ----------------------------------------------------------------
  console.log('\n--- Group 2: Distance & Routing Fallback ---');

  // Distance between Jaipur (26.9124, 75.7873) and New Delhi (28.5672, 77.2100)
  const straightLineDistance = calculateHaversineDistanceKm(26.9124, 75.7873, 28.5672, 77.21);
  // Expected straight-line distance is ~235-245 km
  assert(
    straightLineDistance >= 230 && straightLineDistance <= 250,
    `Haversine straight-line distance calculation accurate (${straightLineDistance} km)`
  );

  const routeResult = await calculateRoute(
    { latitude: 26.9124, longitude: 75.7873, label: 'Jaipur' },
    { latitude: 28.5672, longitude: 77.21, label: 'Delhi' },
    'DRIVING'
  );
  assert(routeResult.distanceKm > straightLineDistance, 'Route distance includes road network factor');
  assert(
    routeResult.routeSource === 'OSRM_LIVE' || routeResult.routeSource === 'ESTIMATED_HAVERSINE_ROAD_FACTOR',
    `Route source correctly tagged with transparency label: ${routeResult.routeSource}`
  );
  assert(
    Array.isArray(routeResult.geometryPolyline) && routeResult.geometryPolyline.length > 0,
    'Polyline coordinates generated for map rendering'
  );

  // ----------------------------------------------------------------
  // Group 3: Cost-Estimation Formulas & Missing Inputs
  // ----------------------------------------------------------------
  console.log('\n--- Group 3: Travel Cost Estimation Formulas ---');

  // Test driving 100 km one-way (roundtrip 200 km * 12.00 INR = 2,400 INR)
  const drivingCostOutcome = calculateTravelCost({
    oneWayDistanceKm: 100,
    mode: 'DRIVING',
    currency: 'INR',
  });
  assert(drivingCostOutcome.estimate !== null, 'Valid distance computes cost estimate');
  assert(
    drivingCostOutcome.estimate?.estimatedCost === 2400,
    `Driving cost correctly calculated as ₹2,400 (roundtrip 200km @ ₹12/km, got ₹${drivingCostOutcome.estimate?.estimatedCost})`
  );
  assert(
    drivingCostOutcome.estimate?.incidentalLodgingCost === 0,
    'Same-day short travel (<250 km) does not add lodging incidental'
  );

  // Test long-distance > 250 km (e.g. 270 km one-way) -> requires overnight lodging allowance
  const longDistanceCostOutcome = calculateTravelCost({
    oneWayDistanceKm: 270,
    mode: 'DRIVING',
    currency: 'INR',
  });
  assert(
    (longDistanceCostOutcome.estimate?.incidentalLodgingCost || 0) > 0,
    'Long-distance travel (>250 km) adds post-op lodging/subsistence allowance'
  );
  assert(
    Boolean(longDistanceCostOutcome.estimate?.assumptions.some((a) => a.includes('Round-trip multiplier'))),
    'Cost estimate includes transparent round-trip assumption'
  );

  // Test missing / zero / invalid distance
  const invalidCostOutcome = calculateTravelCost({
    oneWayDistanceKm: 0,
    mode: 'DRIVING',
  });
  assert(
    invalidCostOutcome.estimate === null && typeof invalidCostOutcome.missingReason === 'string',
    'Zero distance safely returns null with explicit missingReason'
  );

  // ----------------------------------------------------------------
  // Group 4: Safety Circuit-Breaker: Urgent Escalation Precedence
  // ----------------------------------------------------------------
  console.log('\n--- Group 4: Clinical Safety & Emergency Escalation Override ---');

  // Test stable patient (low risk): Routine local option should be recommended
  const stableResult = await executeTravelComparison({
    patientId: 'pt-101',
    origin: { latitude: 26.9124, longitude: 75.7873, label: 'Jaipur' },
    requiredService: 'POST_OP_WOUND_CARE',
    transportMode: 'DRIVING',
    simulateClinicalUrgency: 'LOW',
  });

  assert(
    !stableResult.isEscalated && stableResult.recommendedCategory === 'LOCAL_VERIFIED_CLINIC',
    'Stable patient receives local verified clinic recommendation'
  );
  assert(
    (stableResult.potentialTravelSavingsKm || 0) > 400,
    `Calculates round-trip travel savings (${stableResult.potentialTravelSavingsKm} km saved)`
  );

  // CRITICAL TEST: When clinical urgency is CRITICAL, travel comparison MUST be overridden!
  const criticalResult = await executeTravelComparison({
    patientId: 'pt-101',
    origin: { latitude: 26.9124, longitude: 75.7873, label: 'Jaipur' },
    requiredService: 'POST_OP_WOUND_CARE',
    transportMode: 'DRIVING',
    simulateClinicalUrgency: 'CRITICAL',
  });

  assert(
    criticalResult.isEscalated === true,
    'MANDATORY SAFETY: Critical risk triggers isEscalated: true'
  );
  assert(
    criticalResult.recommendedCategory === 'EMERGENCY_ESCALATION',
    'MANDATORY SAFETY: Recommendation category set to EMERGENCY_ESCALATION'
  );
  assert(
    criticalResult.status === 'ESCALATED',
    'MANDATORY SAFETY: Status marked as ESCALATED'
  );
  assert(
    criticalResult.recommendationRationale.includes('EMERGENCY ESCALATION ACTIVE'),
    'MANDATORY SAFETY: Plain-text rationale instructs immediate emergency triage'
  );
  assert(
    criticalResult.candidates[0].costEstimate === null,
    'MANDATORY SAFETY: Cost optimization is disabled during emergency escalation'
  );

  // ----------------------------------------------------------------
  // Group 5: Service Eligibility Verification
  // ----------------------------------------------------------------
  console.log('\n--- Group 5: Healthcare Service Eligibility Screening ---');

  // Check candidate that does not offer requested service
  const serviceMismatchCandidate = stableResult.candidates.find(
    (c) => c.providerId === 'hp-jaipur-diag'
  );
  assert(
    serviceMismatchCandidate !== undefined && serviceMismatchCandidate.isEligible === false,
    'Facility lacking required post-op service is marked as ineligible'
  );
  assert(
    typeof serviceMismatchCandidate?.ineligibilityReason === 'string',
    `Provides explicit ineligibility reason: "${serviceMismatchCandidate?.ineligibilityReason}"`
  );

  // ----------------------------------------------------------------
  // Group 6: API Request Schema Validation
  // ----------------------------------------------------------------
  console.log('\n--- Group 6: API Request Contracts & Schemas ---');

  const validApiPayload = {
    patientId: 'pt-101',
    requiredService: 'POST_OP_WOUND_CARE',
    transportMode: 'DRIVING',
  };
  assert(
    TravelComparisonRequestSchema.safeParse(validApiPayload).success,
    'POST /api/travel/compare schema accepts valid request'
  );
  assert(
    !TravelComparisonRequestSchema.safeParse({ ...validApiPayload, simulateClinicalUrgency: 'LOW', origin: { latitude: 26.9, longitude: 75.8, label: 'Jaipur' } }).success,
    'POST /api/travel/compare rejects client-supplied risk and origin overrides'
  );

  const missingPatientIdPayload = {
    origin: { latitude: 26.9, longitude: 75.8, label: 'Jaipur' },
    requiredService: 'POST_OP_WOUND_CARE',
  };
  assert(
    !TravelComparisonRequestSchema.safeParse(missingPatientIdPayload).success,
    'POST /api/travel/compare schema rejects missing patientId'
  );

  const validEscalationPayload = {
    comparisonId: 'tc-test-1',
    patientId: 'pt-101',
    reason: 'Severe fever and surgical wound dehiscence',
    urgencyLevel: 'CRITICAL',
    redFlags: ['Fever > 38.5C', 'Wound erythema'],
  };
  assert(
    EscalationEventRequestSchema.safeParse(validEscalationPayload).success,
    'POST /api/travel/escalations schema accepts valid escalation event'
  );

  // ----------------------------------------------------------------
  // Group 7: Phase 3 Safety Hardening - Missing & Stale Clinical Risk
  // ----------------------------------------------------------------
  console.log('\n--- Group 7: Phase 3 Safety Hardening - Missing & Stale Risk ---');

  // Test missing risk: Must NEVER be treated as low risk
  const missingRiskResult = await executeTravelComparison({
    patientId: 'pt-non-existent-patient-999',
    origin: { latitude: 26.9124, longitude: 75.7873, label: 'Jaipur' },
    requiredService: 'POST_OP_WOUND_CARE',
    transportMode: 'DRIVING',
  });

  assert(
    missingRiskResult.clinicalRisk.isMissing === true,
    'MANDATORY SAFETY: Missing risk record flags isMissing: true'
  );
  assert(
    missingRiskResult.clinicalRisk.urgencyLevel === 'UNASSESSED_OR_MISSING',
    'MANDATORY SAFETY: Missing risk record assigned UNASSESSED_OR_MISSING status (never assumed LOW)'
  );
  assert(
    missingRiskResult.recommendationRationale.includes('CLINICAL CLEARANCE REQUIRED'),
    'MANDATORY SAFETY: Rationale mandates clinician review before travel clearance'
  );

  // Test that choosing cheaper transport mode (PUBLIC_TRANSIT) CANNOT override emergency escalation
  const transitEscalationResult = await executeTravelComparison({
    patientId: 'pt-101',
    origin: { latitude: 26.9124, longitude: 75.7873, label: 'Jaipur' },
    requiredService: 'POST_OP_WOUND_CARE',
    transportMode: 'PUBLIC_TRANSIT',
    simulateClinicalUrgency: 'CRITICAL',
  });

  assert(
    transitEscalationResult.isEscalated === true && transitEscalationResult.recommendedCategory === 'EMERGENCY_ESCALATION',
    'MANDATORY SAFETY: Selecting cheaper transit mode CANNOT suppress emergency escalation'
  );
  assert(
    transitEscalationResult.candidates[0].costEstimate === null,
    'MANDATORY SAFETY: Cost calculation remains disabled during emergency escalation'
  );

  // ----------------------------------------------------------------
  // Group 8: Phase 3 Routing & Coordinate Boundary Hardening
  // ----------------------------------------------------------------
  console.log('\n--- Group 8: Phase 3 Routing & Coordinate Boundary Hardening ---');

  // Test zero distance: origin == destination
  const zeroDistRoute = await calculateRoute(
    { latitude: 26.9, longitude: 75.8, label: 'Same Spot' },
    { latitude: 26.9, longitude: 75.8, label: 'Same Spot' }
  );
  assert(
    zeroDistRoute.distanceKm === 0 && zeroDistRoute.durationMins === 0,
    'Zero-distance origin == destination returns 0 km, 0 mins cleanly'
  );

  // Test out-of-bounds latitude throws descriptive error
  let caughtCoordError = false;
  try {
    await calculateRoute(
      { latitude: 95.0, longitude: 75.0, label: 'Out of bounds lat' },
      { latitude: 26.9, longitude: 75.8, label: 'Valid destination' }
    );
  } catch (err: any) {
    caughtCoordError = true;
    assert(
      err.message.includes('latitudes must be between -90 and 90'),
      'Routing adapter throws descriptive error for out-of-bounds coordinates'
    );
  }
  assert(caughtCoordError, 'Out-of-bounds coordinates throw validation error');

  // ----------------------------------------------------------------
  // Group 9: Phase 3 Cost Calculation Boundary Hardening
  // ----------------------------------------------------------------
  console.log('\n--- Group 9: Phase 3 Cost Calculation Boundary Hardening ---');

  // Test negative custom rate rejected
  const negativeRateOutcome = calculateTravelCost({
    oneWayDistanceKm: 50,
    mode: 'DRIVING',
    customRatePerKm: -5.0,
  });
  assert(
    negativeRateOutcome.estimate === null &&
      Boolean(negativeRateOutcome.missingReason?.includes('positive number greater than zero')),
    'Negative custom rate per km rejected with explicit reason'
  );

  // Test negative distance rejected
  const negativeDistOutcome = calculateTravelCost({
    oneWayDistanceKm: -120,
    mode: 'DRIVING',
  });
  assert(
    negativeDistOutcome.estimate === null &&
      Boolean(negativeDistOutcome.missingReason?.includes('greater than zero')),
    'Negative distance rejected with explicit reason'
  );

  // ----------------------------------------------------------------
  // Group 10: Phase 5 Route Caching & Normalization
  // ----------------------------------------------------------------
  console.log('\n--- Group 10: Phase 5 Route Caching & Normalization ---');

  clearRouteCache();
  const initialCacheStats = getRouteCacheStats();
  assert(initialCacheStats.size === 0 && initialCacheStats.hits === 0, 'Route cache initialized clean');

  // Call route calculation 1st time
  const ptA = { latitude: 26.9124, longitude: 75.7873, label: 'Origin A' };
  const ptB = { latitude: 28.5672, longitude: 77.2100, label: 'Dest B' };
  const firstRoute = await calculateRoute(ptA, ptB, 'DRIVING');
  assert(firstRoute.distanceKm > 0, 'Initial route calculated successfully');

  // Call route calculation 2nd time with exact coordinates
  const secondRoute = await calculateRoute(ptA, ptB, 'DRIVING');
  assert(
    secondRoute.routeSource === 'OSRM_CACHED' || secondRoute.routeSource === 'ESTIMATED_HAVERSINE_ROAD_FACTOR',
    `Repeated query handled correctly: ${secondRoute.routeSource}`
  );

  const afterCacheStats = getRouteCacheStats();
  assert(afterCacheStats.hits >= 1 || afterCacheStats.misses >= 1, 'Cache stats recorded lookup hits or misses');

  // Call with coordinates micro-differing at 6th decimal place (within 4-decimal normalization)
  const ptAMicro = { latitude: 26.9124001, longitude: 75.7873002, label: 'Origin A micro' };
  const microRoute = await calculateRoute(ptAMicro, ptB, 'DRIVING');
  assert(
    microRoute.distanceKm === firstRoute.distanceKm,
    'Coordinate normalization (4 decimals) correctly clusters micro-fluctuations to identical cache key'
  );

  // ----------------------------------------------------------------
  // Group 11: Phase 5 Circuit Breaker Resilience & Failover
  // ----------------------------------------------------------------
  console.log('\n--- Group 11: Phase 5 Circuit Breaker State & Fast Fallback ---');

  resetCircuitBreaker();
  const cbInitial = getCircuitBreakerStatus();
  assert(cbInitial.state === 'CLOSED', 'Circuit breaker initializes in CLOSED state');

  // Trip circuit breaker manually
  tripCircuitBreakerForTesting();
  const cbTripped = getCircuitBreakerStatus();
  assert(cbTripped.state === 'OPEN', 'Circuit breaker trips into OPEN state upon failure threshold');

  // While OPEN, calculateRoute must NOT hang; must fail fast to Haversine fallback
  const fastFailStart = Date.now();
  const openRoute = await calculateRoute(
    { latitude: 26.9124, longitude: 75.7873, label: 'Origin' },
    { latitude: 28.5672, longitude: 77.2100, label: 'Dest' },
    'DRIVING'
  );
  const fastFailElapsed = Date.now() - fastFailStart;
  assert(
    openRoute.routeSource === 'ESTIMATED_HAVERSINE_ROAD_FACTOR' || openRoute.routeSource === 'OSRM_CACHED',
    'Open circuit breaker immediately returns reliable geometric fallback'
  );
  assert(fastFailElapsed < 1000, `Fast failover executed without network timeout delay (${fastFailElapsed}ms < 1000ms)`);

  // Reset circuit breaker
  resetCircuitBreaker();
  assert(getCircuitBreakerStatus().state === 'CLOSED', 'Circuit breaker successfully restored to CLOSED');

  // ----------------------------------------------------------------
  // Group 12: Phase 5 Operational Telemetry & Zero-PHI Compliance
  // ----------------------------------------------------------------
  console.log('\n--- Group 12: Phase 5 Operational Telemetry & Zero-PHI Compliance ---');

  travelTelemetry.reset();
  const initialTelemetry = travelTelemetry.getMetrics();
  assert(initialTelemetry.totalComparisons === 0, 'Telemetry metrics reset cleanly');

  // Execute stable comparison
  await executeTravelComparison({
    patientId: 'pt-101',
    origin: { latitude: 26.9124, longitude: 75.7873, label: 'Jaipur' },
    requiredService: 'POST_OP_WOUND_CARE',
    transportMode: 'DRIVING',
    simulateClinicalUrgency: 'LOW',
  });

  const updatedTelemetry = travelTelemetry.getMetrics();
  assert(updatedTelemetry.totalComparisons === 1, 'Telemetry recorded comparison execution');
  assert(updatedTelemetry.completedComparisons === 1, 'Telemetry tracked successful completion');
  assert(updatedTelemetry.totalDistanceSavedKm > 0, `Telemetry tracked patient distance savings: ${updatedTelemetry.totalDistanceSavedKm} km`);

  // Execute emergency escalation
  await executeTravelComparison({
    patientId: 'pt-103',
    origin: { latitude: 23.6889, longitude: 86.9661, label: 'Asansol' },
    requiredService: 'POST_OP_WOUND_CARE',
    transportMode: 'DRIVING',
    simulateClinicalUrgency: 'CRITICAL',
  });

  const escalatedTelemetry = travelTelemetry.getMetrics();
  assert(escalatedTelemetry.escalatedComparisons === 1, 'Telemetry recorded emergency clinical escalation');

  // Zero-PHI Verification: Ensure metrics object contains no identifiable patient health information
  const telemetryJson = JSON.stringify(escalatedTelemetry);
  assert(
    !telemetryJson.includes('Rajesh Sharma') &&
    !telemetryJson.includes('Amitabh Ghosh') &&
    !telemetryJson.includes('purulent drainage') &&
    !telemetryJson.includes('tachycardia'),
    'ZERO-PHI AUDIT: Telemetry metrics contains zero patient names, identifiers, or clinical symptoms'
  );

  // ----------------------------------------------------------------
  // Group 13: Phase 5 Concurrent Load & Stress Handling
  // ----------------------------------------------------------------
  console.log('\n--- Group 13: Phase 5 Concurrent Load & Stress Handling ---');

  const concurrentRequests = [
    executeTravelComparison({
      patientId: 'pt-101',
      origin: { latitude: 26.9124, longitude: 75.7873, label: 'Jaipur' },
      requiredService: 'POST_OP_WOUND_CARE',
      transportMode: 'DRIVING',
    }),
    executeTravelComparison({
      patientId: 'pt-102',
      origin: { latitude: 21.1702, longitude: 72.8311, label: 'Surat' },
      requiredService: 'POST_OP_WOUND_CARE',
      transportMode: 'DRIVING',
    }),
    executeTravelComparison({
      patientId: 'pt-103',
      origin: { latitude: 23.6889, longitude: 86.9661, label: 'Asansol' },
      requiredService: 'POST_OP_WOUND_CARE',
      transportMode: 'DRIVING',
    }),
    executeTravelComparison({
      patientId: 'pt-101',
      origin: { latitude: 26.9124, longitude: 75.7873, label: 'Jaipur' },
      requiredService: 'SUTURE_REMOVAL',
      transportMode: 'PUBLIC_TRANSIT',
    }),
    executeTravelComparison({
      patientId: 'pt-102',
      origin: { latitude: 21.1702, longitude: 72.8311, label: 'Surat' },
      requiredService: 'STAPLE_REMOVAL',
      transportMode: 'TAXI',
    }),
  ];

  const concurrentResults = await Promise.all(concurrentRequests);
  assert(
    concurrentResults.length === 5 && concurrentResults.every((r) => r && r.status),
    '5 concurrent comparisons completed cleanly without race conditions or memory corruption'
  );

  // ----------------------------------------------------------------
  // Summary
  // ----------------------------------------------------------------
  console.log('\n======================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`TOTAL TESTS: ${totalCount} | PASSED: ${passedCount} | FAILED: ${totalCount - passedCount}`);
  console.log('======================================================\n');

  if (passedCount !== totalCount) {
    throw new Error(`${totalCount - passedCount} travel module test(s) failed`);
  }
}

describe('Member 4: Travel Optimization & Escalation Suite', () => {
  it('runs all travel module coordinate, routing, distance, cost, and concurrency checks', async () => {
    await runAllTests();
    const passedCount = results.filter((r) => r.passed).length;
    expect(passedCount).toBe(results.length);
    expect(passedCount).toBeGreaterThan(0);
  }, 30000);
});
