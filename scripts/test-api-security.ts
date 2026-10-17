// ============================================================================
// AUTOMATED API SECURITY & ROLE AUTHORIZATION TEST SUITE (PHASE 3)
// ============================================================================

async function runSecurityTests() {
  const baseUrl = 'http://localhost:3000/api';
  console.log(`\n============================================================`);
  console.log(`🛡️ RUNNING API SECURITY & AUTHORIZATION TESTS`);
  console.log(`Target: ${baseUrl}`);
  console.log(`============================================================\n`);

  let passed = 0;
  let failed = 0;

  async function check(name: string, fn: () => Promise<boolean>) {
    try {
      const ok = await fn();
      if (ok) {
        passed++;
        console.log(`  ✓ PASS: ${name}`);
      } else {
        failed++;
        console.error(`  ✗ FAIL: ${name}`);
      }
    } catch (e) {
      failed++;
      console.error(`  ✗ ERROR in ${name}:`, e);
    }
  }

  // 1. Unauthorized Facility Registration
  await check('POST /providers without role header returns 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/providers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Malicious Medical Post', city: 'Bengaluru', state: 'KA', postalCode: '560001' }),
    });
    return res.status === 403;
  });

  // 2. Patient Role Registration Attempt
  await check('POST /providers with role PATIENT returns 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/providers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'PATIENT' },
      body: JSON.stringify({ name: 'Patient Medical Post', city: 'Bengaluru', state: 'KA', postalCode: '560001' }),
    });
    return res.status === 403;
  });

  // 3. Authorized Coordinator Registration
  await check('POST /providers with role COORDINATOR creates facility (201)', async () => {
    const res = await fetch(`${baseUrl}/providers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'COORDINATOR' },
      body: JSON.stringify({
        name: 'Authorized Satellite Clinic',
        facilityType: 'CLINIC',
        addressLine1: 'MG Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
      }),
    });
    const json = await res.json();
    return res.status === 201 && json.success === true && json.data.verificationStatus === 'PENDING_REVIEW';
  });

  // 4. Unauthorized PATCH
  await check('PATCH /providers/:id with role PATIENT returns 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/providers/fac_blr_001`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'PATIENT' },
      body: JSON.stringify({ name: 'Tampered Name' }),
    });
    return res.status === 403;
  });

  // 5. Verification Tampering via PATCH
  await check('PATCH /providers/:id attempting direct verificationStatus mutation returns 400', async () => {
    const res = await fetch(`${baseUrl}/providers/fac_blr_001`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'ADMIN' },
      body: JSON.stringify({ verificationStatus: 'VERIFIED' }),
    });
    const json = await res.json();
    return res.status === 400 && json.error.code === 'INVALID_OPERATION';
  });

  // 6. Unauthorized Verification Endpoint
  await check('POST /providers/:id/verification without role returns 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/providers/fac_blr_004/verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'VERIFIED', evidenceNotes: 'Audited by coordinator' }),
    });
    return res.status === 403;
  });

  // 7. Insufficient Audit Evidence Notes
  await check('POST /providers/:id/verification with short evidence (<10 chars) returns 400', async () => {
    const res = await fetch(`${baseUrl}/providers/fac_blr_004/verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'ADMIN' },
      body: JSON.stringify({ status: 'VERIFIED', evidenceNotes: 'Too short' }),
    });
    const json = await res.json();
    return res.status === 400 && json.error.code === 'INSUFFICIENT_EVIDENCE';
  });

  // 8. Authorized Verification with Evidence
  await check('POST /providers/:id/verification with role ADMIN & valid evidence returns 200', async () => {
    const res = await fetch(`${baseUrl}/providers/fac_blr_004/verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'ADMIN' },
      body: JSON.stringify({
        status: 'VERIFIED',
        registryLicenseNo: 'KPME-KA-2024-8901',
        evidenceNotes: 'Official KPME registry check completed. Clinic verified for routine post-operative dressing.',
      }),
    });
    const json = await res.json();
    return res.status === 200 && json.success === true && json.data.verificationStatus === 'VERIFIED';
  });

  // 9. Input Boundary Check: Invalid Latitude
  await check('GET /providers?latitude=105 returns 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/providers?latitude=105&longitude=77.5`);
    const json = await res.json();
    return res.status === 400 && json.error.code === 'INVALID_COORDINATES';
  });

  // 10. Input Boundary Check: Excessive Search Query Length
  await check('GET /providers with searchTerm > 150 chars returns 400 Bad Request', async () => {
    const longQuery = 'X'.repeat(160);
    const res = await fetch(`${baseUrl}/providers?searchTerm=${longQuery}`);
    const json = await res.json();
    return res.status === 400 && json.error.code === 'INVALID_PARAMETER';
  });

  console.log(`\n============================================================`);
  console.log(`📊 API SECURITY SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`============================================================\n`);

  if (failed > 0) process.exit(1);
}

runSecurityTests();
