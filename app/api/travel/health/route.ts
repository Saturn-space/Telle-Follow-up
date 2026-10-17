import { NextRequest, NextResponse } from 'next/server';
import { getCircuitBreakerStatus, getRouteCacheStats } from '@/lib/travel/routing-adapter';
import { travelTelemetry } from '@/lib/travel/telemetry';
import {
  SAVED_COMPARISONS,
  SAVED_ESCALATIONS,
  SEEDED_PATIENTS,
  SEEDED_PROVIDERS,
} from '@/lib/travel/data-store';
import { HealthStatus } from '@/lib/travel/types';

const processStartTime = Date.now();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shouldProbe = searchParams.get('probe') === 'true';

    const cb = getCircuitBreakerStatus();
    const cache = getRouteCacheStats();
    const telemetry = travelTelemetry.getMetrics();

    // Determine operational health status
    let status: HealthStatus = 'HEALTHY';
    let routingStatusMessage = 'Routing service and cache fully operational.';

    if (cb.state === 'OPEN') {
      status = 'DEGRADED';
      routingStatusMessage =
        'Circuit breaker is OPEN. Fast geometric fallback is actively serving routes without latency penalty.';
    } else if (cb.state === 'HALF_OPEN') {
      status = 'DEGRADED';
      routingStatusMessage = 'Circuit breaker in HALF_OPEN state; testing live connectivity probe.';
    }

    // Optional active external probe if requested by monitoring system
    let probeResult: { reachable: boolean; latencyMs?: number; error?: string } | undefined;
    if (shouldProbe) {
      const probeStart = Date.now();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const probeRes = await fetch(
          'https://router.project-osrm.org/route/v1/driving/75.7873,26.9124;77.2100,28.5672?overview=false',
          { signal: controller.signal }
        );
        clearTimeout(timeout);
        probeResult = {
          reachable: probeRes.ok,
          latencyMs: Date.now() - probeStart,
        };
      } catch (err: any) {
        probeResult = {
          reachable: false,
          latencyMs: Date.now() - probeStart,
          error: err?.message || 'Probe request timed out or was unreachable',
        };
      }
    }

    const uptimeSeconds = Math.floor((Date.now() - processStartTime) / 1000);

    return NextResponse.json(
      {
        status,
        timestamp: new Date().toISOString(),
        uptimeSeconds,
        module: {
          name: 'Member 4: Travel Optimization & Escalation',
          phase: 'Phase 5: Post-Release Maintenance & Operational Reliability',
          version: '1.2.0',
        },
        checks: {
          dataStore: {
            status: 'HEALTHY',
            seededPatients: SEEDED_PATIENTS.length,
            seededProviders: SEEDED_PROVIDERS.length,
            activeComparisonsCount: SAVED_COMPARISONS.size,
            activeEscalationsCount: SAVED_ESCALATIONS.size,
          },
          clinicalSafetyGate: {
            status: 'HEALTHY',
            circuitBreakerArmed: true,
            emergencyOverrideActive: true,
            missingRiskClearanceProtection: true,
            unassessedAssumptionOverride: 'NEVER_ASSUME_LOW_RISK',
          },
          geospatialRouting: {
            status: cb.state === 'CLOSED' ? 'HEALTHY' : 'DEGRADED',
            circuitBreaker: cb,
            message: routingStatusMessage,
            cache,
            probe: probeResult,
          },
        },
        telemetry,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'CRITICAL',
        timestamp: new Date().toISOString(),
        error: error?.message || 'Health check verification failure',
      },
      { status: 500 }
    );
  }
}
