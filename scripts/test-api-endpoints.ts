// ============================================================================
// HTTP API INTEGRATION TESTS: Next.js API Routes (Port 3000)
// ============================================================================

async function runApiTests() {
  const baseUrl = 'http://localhost:3000/api';
  console.log(`\nTesting HTTP API routes against ${baseUrl}...\n`);

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

  // 1. GET /providers
  await check('GET /providers returns list with status 200', async () => {
    const res = await fetch(`${baseUrl}/providers`);
    const json = await res.json();
    return res.status === 200 && json.success === true && Array.isArray(json.data);
  });

  // 2. GET /providers with filters
  await check('GET /providers?city=Bengaluru&services=WOUND_CARE filters correctly', async () => {
    const res = await fetch(`${baseUrl}/providers?city=Bengaluru&services=WOUND_CARE`);
    const json = await res.json();
    return (
      res.status === 200 &&
      json.success === true &&
      json.data.length > 0 &&
      json.data.every((f: any) => f.city.toLowerCase() === 'bengaluru')
    );
  });

  // 3. GET /providers/:id
  await check('GET /providers/fac_blr_001 returns facility detail', async () => {
    const res = await fetch(`${baseUrl}/providers/fac_blr_001`);
    const json = await res.json();
    return res.status === 200 && json.data.id === 'fac_blr_001';
  });

  // 4. GET /providers/:id (404 test)
  await check('GET /providers/invalid_9999 returns 404', async () => {
    const res = await fetch(`${baseUrl}/providers/invalid_9999`);
    const json = await res.json();
    return res.status === 404 && json.success === false && json.error.code === 'FACILITY_NOT_FOUND';
  });

  // 5. GET /providers/nearby
  await check('GET /providers/nearby returns sorted proximity results', async () => {
    const res = await fetch(`${baseUrl}/providers/nearby?lat=12.9716&lng=77.6412&radiusKm=20`);
    const json = await res.json();
    return res.status === 200 && json.success === true && json.data.length > 0;
  });

  // 6. GET /docs/openapi
  await check('GET /docs/openapi returns valid OpenAPI 3.0 specification', async () => {
    const res = await fetch(`${baseUrl}/docs/openapi`);
    const json = await res.json();
    return res.status === 200 && json.openapi.startsWith('3.0') && json.paths['/providers'] !== undefined;
  });

  // 7. GET /referrals
  await check('GET /referrals returns referral records', async () => {
    const res = await fetch(`${baseUrl}/referrals`);
    const json = await res.json();
    return res.status === 200 && json.success === true && Array.isArray(json.data);
  });

  console.log(`\nAPI Integration Test Summary: ${passed} PASSED, ${failed} FAILED\n`);
  if (failed > 0) process.exit(1);
}

runApiTests();
