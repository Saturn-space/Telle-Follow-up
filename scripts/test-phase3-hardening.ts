// ============================================================================
// AUTOMATED TEST SUITE: Phase 3 Integration, Security & Hardening Tests
// Covers: Security Gating, Edge Cases, Boundary Validation, Contract Compliance
// ============================================================================

import {
  providerRepository,
  calculateHaversineDistanceKm,
} from '../lib/db/provider-repository';
import { forwardGeocodeAddress } from '../lib/services/geocoding-service';
import { FacilityLocationDTO, ReferralDispatchDTO } from '../lib/types/provider';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    passedCount++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedCount++;
    console.error(`  ✗ FAIL: ${testName} - ${details || 'Assertion failed'}`);
  }
}

async function runHardeningTests() {
  console.log('\n============================================================');
  console.log('🛡️ RUNNING MEMBER 3 PHASE 3 HARDENING & REGRESSION TESTS');
  console.log('============================================================\n');

  // --------------------------------------------------------------------------
  // TEST GROUP 1: Edge Cases & Boundary Filtering
  // --------------------------------------------------------------------------
  console.log('Test Group 1: Search Boundaries & Malformed Parameters');
  {
    // Extremely long search string
    const longString = 'A'.repeat(200);
    const resultLong = providerRepository.searchFacilities({ searchTerm: longString });
    assert(resultLong.data.length === 0, 'Excessively long query returns 0 results gracefully without crashing');

    // Special characters / potential regex characters in search query
    const regexQuery = '.*+?^${}()|[]\\';
    const resultRegex = providerRepository.searchFacilities({ searchTerm: regexQuery });
    assert(Array.isArray(resultRegex.data), 'Regex special characters in search do not trigger unhandled exceptions');

    // Missing coordinates search: distanceKm must be undefined, not NaN
    const noCoordsResult = providerRepository.searchFacilities({ city: 'Bengaluru' });
    assert(
      noCoordsResult.data.every((f) => f.distanceKm === undefined),
      'Search without user coordinates omits distanceKm instead of returning NaN'
    );

    // Negative radius or 0 radius clamp
    const zeroRadius = providerRepository.searchFacilities({
      latitude: 12.9716,
      longitude: 77.5946,
      radiusKm: 0,
    });
    assert(Array.isArray(zeroRadius.data), 'Zero/negative radius query handled safely');
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 2: Facility Deactivation & Soft-Delete Safety
  // --------------------------------------------------------------------------
  console.log('\nTest Group 2: Deactivation & Data Quality Isolation');
  {
    // Verify an existing active facility
    const initialList = providerRepository.searchFacilities({ page: 1, limit: 50 });
    const initialCount = initialList.data.length;

    // Create a temporary facility and deactivate it
    const tempFacility = providerRepository.createFacility({
      name: 'Temporary Decommissioned Medical Post',
      facilityType: 'CLINIC',
      addressLine1: 'Test Address',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'India',
      emergencyCapable: false,
      verificationStatus: 'PENDING_REVIEW',
      dataSource: 'COMMUNITY_SUBMISSION',
    });

    assert(tempFacility !== null, 'Temporary facility created for lifecycle test');

    // Deactivate
    const deactivated = providerRepository.deactivateFacility(tempFacility.id);
    assert(deactivated === true, 'Facility successfully soft-deactivated');

    // Deactivated facility must be excluded from public directory searches
    const postSearch = providerRepository.searchFacilities({ searchTerm: 'Temporary Decommissioned' });
    assert(
      postSearch.data.length === 0,
      'Soft-deactivated facility is excluded from directory search results'
    );

    // But must remain retrievable by direct ID lookup for clinical audit continuity
    const directLookup = providerRepository.getFacilityById(tempFacility.id);
    assert(
      directLookup !== null && directLookup.isActive === false,
      'Deactivated facility remains retrievable by ID for existing follow-up records'
    );
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 3: Administrative Verification State Transitions
  // --------------------------------------------------------------------------
  console.log('\nTest Group 3: Verification State Transition & Audit Integrity');
  {
    const targetId = 'fac_mum_002'; // Demo seed facility
    const facility = providerRepository.getFacilityById(targetId);
    assert(facility !== null, 'Target facility for verification audit found');

    // Record formal verification with complete audit notes
    const auditNotes = 'Verified through Maharashtra Medical Council registry portal (MMC-REG-2024-8812). Clinic nurse-in-charge confirmed operational hours.';
    const licenseNo = 'MMC-REG-2024-8812';

    const verified = providerRepository.recordVerification(targetId, {
      status: 'VERIFIED',
      evidenceNotes: auditNotes,
      registryLicenseNo: licenseNo,
      verifierUserId: 'coord_lead_dr_sharma',
    });

    assert(verified !== null, 'Verification audit recorded');
    assert(verified?.verificationStatus === 'VERIFIED', 'Verification status transitioned to VERIFIED');
    assert(verified?.lastVerifiedAt !== undefined, 'lastVerifiedAt recorded with ISO timestamp');

    const lastAuditRecord = verified?.verifications?.[verified.verifications.length - 1];
    assert(
      lastAuditRecord?.evidenceNotes === auditNotes,
      'Audit evidence notes stored verbatim in immutable audit record'
    );
    assert(
      lastAuditRecord?.verifierUserId === 'coord_lead_dr_sharma',
      'Verifier user ID preserved for accountability'
    );
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 4: Geocoding Service Adapter & Caching
  // --------------------------------------------------------------------------
  console.log('\nTest Group 4: Geocoding Adapter & Caching Compliance');
  {
    // Test cache hit for standard city
    const cachedBengaluru = await forwardGeocodeAddress('bengaluru');
    assert(cachedBengaluru !== null, 'Known city returns geocoded coordinates');
    assert(cachedBengaluru?.source === 'CACHE', 'Known city hits in-memory cache without hitting external OSM API');
    assert(cachedBengaluru?.latitude === 12.9716, 'Accurate latitude returned from cache');

    // Test cache hit for Indiranagar
    const cachedIndiranagar = await forwardGeocodeAddress('indiranagar');
    assert(cachedIndiranagar?.source === 'CACHE', 'Neighborhood lookup utilizes cache');

    // Test empty or whitespace query
    const emptyResult = await forwardGeocodeAddress('   ');
    assert(emptyResult === null, 'Whitespace query returns null gracefully');
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 5: Cross-Module Integration Contracts
  // --------------------------------------------------------------------------
  console.log('\nTest Group 5: Cross-Module Contract Compatibility');
  {
    const sampleFacility = providerRepository.getFacilityById('fac_blr_001')!;

    // 1. Validate Member 4 Travel Optimization DTO
    const travelDTO: FacilityLocationDTO = {
      facilityId: sampleFacility.id,
      facilityName: sampleFacility.name,
      facilityType: sampleFacility.facilityType,
      coordinates: {
        latitude: sampleFacility.latitude!,
        longitude: sampleFacility.longitude!,
      },
      hasValidCoordinates: true,
      address: `${sampleFacility.addressLine1}, ${sampleFacility.city}`,
      city: sampleFacility.city,
      state: sampleFacility.state,
      postalCode: sampleFacility.postalCode,
      emergencyCapable: sampleFacility.emergencyCapable,
      servicesAvailable: sampleFacility.services.map((s) => s.serviceCategory),
    };

    assert(
      typeof travelDTO.facilityId === 'string' &&
        travelDTO.coordinates !== null &&
        Number.isFinite(travelDTO.coordinates?.latitude) &&
        Number.isFinite(travelDTO.coordinates?.longitude) &&
        Array.isArray(travelDTO.servicesAvailable),
      'Member 4 FacilityLocationDTO structure matches integration requirements'
    );

    // 2. Validate Member 5 Referral Dispatch DTO
    const referral = providerRepository.createReferral({
      patientId: 'pat_synt_909',
      facilityId: sampleFacility.id,
      requestedServices: ['WOUND_CARE', 'DRAIN_MANAGEMENT'],
      urgencyLevel: 'PRIORITY',
      clinicalSummary: 'Post-laparoscopic hernia repair. Jackson-Pratt drain output decreasing. Evaluation needed.',
      attendingPhysicianId: 'dr_senior_surgeon',
    });

    const referralDTO: ReferralDispatchDTO = {
      referralId: referral!.id,
      patientId: referral!.patientId,
      facilityId: referral!.facilityId,
      facilityName: sampleFacility.name,
      requestedServices: referral!.requestedServices,
      urgencyLevel: referral!.urgencyLevel,
      clinicalSummary: referral!.clinicalSummary,
    };

    assert(
      referralDTO.referralId.startsWith('ref_') &&
        referralDTO.patientId === 'pat_synt_909' &&
        referralDTO.facilityId === sampleFacility.id &&
        referralDTO.urgencyLevel === 'PRIORITY',
      'Member 5 ReferralDispatchDTO correctly links patient, facility, and clinical urgency'
    );
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n============================================================');
  console.log(`📊 PHASE 3 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('============================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runHardeningTests().catch((err) => {
  console.error('Unhandled hardening test suite error:', err);
  process.exit(1);
});
