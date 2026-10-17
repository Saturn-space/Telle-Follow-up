// ============================================================================
// AUTOMATED TEST SUITE: Member 3 - Healthcare Provider Directory
// Tests: Search, Filtering, Proximity Math, Verification, Referrals & Guardrails
// ============================================================================

import {
  providerRepository,
  calculateHaversineDistanceKm,
} from '../lib/db/provider-repository';
import { ServiceCategory } from '../lib/types/provider';

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

async function runTestSuite() {
  console.log('\n============================================================');
  console.log('🧪 RUNNING MEMBER 3 PROVIDER DIRECTORY AUTOMATED TESTS');
  console.log('============================================================\n');

  // --------------------------------------------------------------------------
  // TEST 1: Haversine Distance Math
  // --------------------------------------------------------------------------
  console.log('Test Group 1: Geospatial Haversine Math');
  {
    // Indiranagar (12.9719, 77.6412) to Domlur (12.9608, 77.6387) ~ 1.2 - 1.3 km
    const dist1 = calculateHaversineDistanceKm(12.9719, 77.6412, 12.9608, 77.6387);
    assert(dist1 >= 1.0 && dist1 <= 1.5, 'Indiranagar to Domlur distance calculation', `Got ${dist1} km`);

    // Bengaluru (12.9716, 77.5946) to Mumbai (19.0760, 72.8777) ~ 830-850 km
    const distBlrMum = calculateHaversineDistanceKm(12.9716, 77.5946, 19.076, 72.8777);
    assert(distBlrMum > 800 && distBlrMum < 900, 'Bengaluru to Mumbai inter-city distance calculation', `Got ${distBlrMum} km`);

    // Identical coordinates must be 0 km
    const zeroDist = calculateHaversineDistanceKm(12.9716, 77.5946, 12.9716, 77.5946);
    assert(zeroDist === 0, 'Identical coordinates yield 0 km', `Got ${zeroDist} km`);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Provider Search & Default Listing
  // --------------------------------------------------------------------------
  console.log('\nTest Group 2: Provider Search & Filtering');
  {
    const allProviders = providerRepository.searchFacilities({ page: 1, limit: 50 });
    assert(allProviders.data.length >= 8, 'Initial seed directory contains all seeded facilities', `Got ${allProviders.data.length}`);
    assert(allProviders.meta.totalCount >= 8, 'Total count matches data size', `Got ${allProviders.meta.totalCount}`);

    // Search by City: Bengaluru
    const blrProviders = providerRepository.searchFacilities({ city: 'Bengaluru' });
    assert(
      blrProviders.data.every((f) => f.city.toLowerCase() === 'bengaluru'),
      'City filter strictly returns Bengaluru facilities only'
    );
    assert(blrProviders.data.length === 5, 'Five Bengaluru facilities seeded', `Got ${blrProviders.data.length}`);

    // Search by Free Text
    const textSearch = providerRepository.searchFacilities({ searchTerm: 'St. Jude' });
    assert(textSearch.data.length === 1, 'Search term "St. Jude" returns unique clinic', `Got ${textSearch.data.length}`);
    assert(textSearch.data[0].id === 'fac_blr_001', 'Correct facility ID returned');
  }

  // --------------------------------------------------------------------------
  // TEST 3: Service Category Filtering
  // --------------------------------------------------------------------------
  console.log('\nTest Group 3: Clinical Service Category Filters');
  {
    const woundCareProviders = providerRepository.searchFacilities({
      services: ['WOUND_CARE'],
    });
    assert(
      woundCareProviders.data.every((f) =>
        f.services.some((s) => s.serviceCategory === 'WOUND_CARE')
      ),
      'WOUND_CARE filter returns only facilities with wound care capabilities'
    );

    const xrayProviders = providerRepository.searchFacilities({
      services: ['IMAGING_XRAY'],
    });
    assert(
      xrayProviders.data.every((f) =>
        f.services.some((s) => s.serviceCategory === 'IMAGING_XRAY')
      ),
      'IMAGING_XRAY filter returns only diagnostic/imaging facilities'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 4: Verification Status & Emergency Filters
  // --------------------------------------------------------------------------
  console.log('\nTest Group 4: Verification Badging & Emergency Triage Filters');
  {
    const verifiedOnly = providerRepository.searchFacilities({
      verificationStatus: 'VERIFIED',
    });
    assert(
      verifiedOnly.data.every((f) => f.verificationStatus === 'VERIFIED'),
      'Verified-only filter returns exclusively verified facilities'
    );

    const emergencyOnly = providerRepository.searchFacilities({
      emergencyOnly: true,
    });
    assert(
      emergencyOnly.data.every((f) => f.emergencyCapable === true),
      'Emergency filter returns only facilities equipped with 24/7 ER'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 5: Proximity Radius Sorting
  // --------------------------------------------------------------------------
  console.log('\nTest Group 5: Proximity Radius Sorting');
  {
    // Search around Indiranagar (12.9719, 77.6412) within 15 km
    const proximityResult = providerRepository.searchFacilities({
      latitude: 12.9719,
      longitude: 77.6412,
      radiusKm: 15,
      sortBy: 'distance',
    });

    assert(proximityResult.data.length > 0, 'Facilities found within 15 km of Indiranagar');
    // Ensure all returned are <= 15 km
    assert(
      proximityResult.data.every((f) => f.distanceKm !== undefined && f.distanceKm <= 15),
      'All returned facilities are within 15 km limit'
    );
    // Ensure sorted ascending by distance
    const distances = proximityResult.data.map((f) => f.distanceKm!);
    const isSorted = distances.every((d, i) => i === 0 || d >= distances[i - 1]);
    assert(isSorted, 'Results are strictly sorted in ascending distance order');
  }

  // --------------------------------------------------------------------------
  // TEST 6: Detail Lookup & Missing Record Handling
  // --------------------------------------------------------------------------
  console.log('\nTest Group 6: Detail Lookup & 404 Boundaries');
  {
    const found = providerRepository.getFacilityById('fac_blr_001');
    assert(found !== null && found.name.includes('St. Jude'), 'Existing facility retrieved successfully by ID');

    const notFound = providerRepository.getFacilityById('fac_non_existent_9999');
    assert(notFound === null, 'Non-existent ID correctly returns null (yielding HTTP 404)');
  }

  // --------------------------------------------------------------------------
  // TEST 7: Administrative Verification Audit Logging
  // --------------------------------------------------------------------------
  console.log('\nTest Group 7: Administrative Verification Audit Logging');
  {
    // Initially fac_blr_004 is UNVERIFIED
    const targetId = 'fac_blr_004';
    const before = providerRepository.getFacilityById(targetId);
    assert(before?.verificationStatus === 'UNVERIFIED', 'fac_blr_004 starts as UNVERIFIED');

    // Perform verification audit
    const updated = providerRepository.recordVerification(targetId, {
      status: 'VERIFIED',
      evidenceNotes: 'Telephonic clinical audit conducted with nursing in-charge. Valid KPME clinic registration confirmed.',
      registryLicenseNo: 'KPME-BLR-2024-KOR-991',
      verifierUserId: 'coord_dr_sharma_admin',
    });

    assert(updated !== null, 'Verification operation succeeded');
    assert(updated?.verificationStatus === 'VERIFIED', 'Facility status updated to VERIFIED');
    assert(updated?.lastVerifiedAt !== undefined, 'lastVerifiedAt timestamp recorded');
    assert(
      Boolean(updated?.verifications?.some((v) => v.registryLicenseNo === 'KPME-BLR-2024-KOR-991')),
      'Immutable verification record appended with license number and notes'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 8: Care Referral Creation (Cross-Member Integration)
  // --------------------------------------------------------------------------
  console.log('\nTest Group 8: Care Referral Dispatch');
  {
    const referral = providerRepository.createReferral({
      patientId: 'pat_synt_101',
      facilityId: 'fac_blr_001',
      requestedServices: ['WOUND_CARE', 'SUTURE_REMOVAL'],
      urgencyLevel: 'ROUTINE',
      clinicalSummary: 'Post-laparoscopic cholecystectomy Day 10. Clean port sites. Routine clip removal and wound inspection.',
      attendingPhysicianId: 'dr_surgical_lead',
    });

    assert(referral !== null, 'Care referral created successfully');
    assert(referral?.patientId === 'pat_synt_101', 'Referral links to Member 1 Patient ID');
    assert(referral?.facilityId === 'fac_blr_001', 'Referral links to Member 3 Facility ID');
    assert(referral?.referralStatus === 'DISPATCHED_TO_LOCAL', 'Referral status marked DISPATCHED_TO_LOCAL');

    const allReferrals = providerRepository.listReferrals();
    assert(allReferrals.some((r) => r.id === referral?.id), 'Referral persisted in repository list');
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n============================================================');
  console.log(`📊 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('============================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
