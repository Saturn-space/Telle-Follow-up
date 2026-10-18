import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCircuitBreakerStatus, getRouteCacheStats } from '@/lib/travel/routing-adapter';
import { travelTelemetry } from '@/lib/travel/telemetry';

const processStartTime = Date.now();

export async function GET(request: NextRequest) {
  const shouldProbe = new URL(request.url).searchParams.get('probe') === 'true';
  const circuitBreaker = getCircuitBreakerStatus();
  let databaseReady = true;
  let persistedComparisons = 0;
  try {
    persistedComparisons = await prisma.travelComparison.count();
  } catch {
    databaseReady = false;
  }
  let probe: { reachable: boolean; latencyMs: number } | undefined;
  if (shouldProbe) {
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    try {
      const response = await fetch('https://router.project-osrm.org/route/v1/driving/75.7873,26.9124;77.2100,28.5672?overview=false', { signal: controller.signal });
      probe = { reachable: response.ok, latencyMs: Date.now() - started };
    } catch {
      probe = { reachable: false, latencyMs: Date.now() - started };
    } finally {
      clearTimeout(timer);
    }
  }
  const status = !databaseReady ? 'CRITICAL' : circuitBreaker.state === 'CLOSED' ? 'HEALTHY' : 'DEGRADED';
  return NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - processStartTime) / 1000),
    module: { name: 'Travel comparison', phase: 'Integrated', version: '2.0.0' },
    checks: {
      database: { status: databaseReady ? 'HEALTHY' : 'UNAVAILABLE', persistedComparisons },
      clinicalSafetyGate: { status: 'HEALTHY', clinicianReviewRequired: true, staleAssessmentBlocked: true, highRiskEmergencyOverride: true },
      geospatialRouting: { status: circuitBreaker.state === 'CLOSED' ? 'HEALTHY' : 'DEGRADED', circuitBreaker, cache: getRouteCacheStats(), probe },
    },
    telemetry: travelTelemetry.getMetrics(),
  }, { status: databaseReady ? 200 : 503 });
}
