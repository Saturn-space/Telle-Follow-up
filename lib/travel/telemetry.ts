import { TravelTelemetryMetrics } from './types';
import { getRouteCacheStats, getCircuitBreakerStatus } from './routing-adapter';

// In-Memory Anonymized Operational Metrics Store (ZERO PHI)
class TravelTelemetryStore {
  private totalComparisons = 0;
  private completedComparisons = 0;
  private escalatedComparisons = 0;
  private totalDistanceSavedKm = 0;
  private totalTimeSavedMins = 0;
  private totalDurationMs = 0;

  private routeSources = {
    osrmLive: 0,
    osrmCached: 0,
    haversineFallback: 0,
  };

  /**
   * Records an audited comparison event without any PHI or identifiable information.
   */
  public recordComparison(params: {
    isEscalated: boolean;
    distanceSavedKm?: number;
    durationSavedMins?: number;
    processingDurationMs?: number;
  }) {
    this.totalComparisons++;
    if (params.isEscalated) {
      this.escalatedComparisons++;
    } else {
      this.completedComparisons++;
      if (params.distanceSavedKm && params.distanceSavedKm > 0) {
        this.totalDistanceSavedKm = Math.round((this.totalDistanceSavedKm + params.distanceSavedKm) * 10) / 10;
      }
      if (params.durationSavedMins && params.durationSavedMins > 0) {
        this.totalTimeSavedMins += params.durationSavedMins;
      }
    }
    if (params.processingDurationMs) {
      this.totalDurationMs += params.processingDurationMs;
    }
  }

  /**
   * Tracks route calculation source distribution.
   */
  public recordRouteSource(source: 'OSRM_LIVE' | 'OSRM_CACHED' | 'ESTIMATED_HAVERSINE_ROAD_FACTOR') {
    if (source === 'OSRM_LIVE') {
      this.routeSources.osrmLive++;
    } else if (source === 'OSRM_CACHED') {
      this.routeSources.osrmCached++;
    } else {
      this.routeSources.haversineFallback++;
    }
  }

  /**
   * Returns current system operational telemetry.
   */
  public getMetrics(): TravelTelemetryMetrics {
    const cb = getCircuitBreakerStatus();
    const cache = getRouteCacheStats();

    return {
      totalComparisons: this.totalComparisons,
      completedComparisons: this.completedComparisons,
      escalatedComparisons: this.escalatedComparisons,
      totalDistanceSavedKm: this.totalDistanceSavedKm,
      totalTimeSavedMins: this.totalTimeSavedMins,
      routeSources: { ...this.routeSources },
      circuitBreaker: {
        state: cb.state,
        failures: cb.failures,
        lastTripTime: cb.lastTripTime,
      },
      cache,
    };
  }

  /**
   * Resets telemetry metrics (for unit testing).
   */
  public reset() {
    this.totalComparisons = 0;
    this.completedComparisons = 0;
    this.escalatedComparisons = 0;
    this.totalDistanceSavedKm = 0;
    this.totalTimeSavedMins = 0;
    this.totalDurationMs = 0;
    this.routeSources = {
      osrmLive: 0,
      osrmCached: 0,
      haversineFallback: 0,
    };
  }
}

export const travelTelemetry = new TravelTelemetryStore();
