import { GeoLocation, RouteResult, TransportMode, CircuitBreakerState, RouteCacheStats } from './types';

// ========================================================
// PHASE 5: ROUTE CACHING & CIRCUIT BREAKER CONFIGURATION
// ========================================================

interface CacheEntry {
  result: RouteResult;
  expiresAt: number;
}

const routeCache = new Map<string, CacheEntry>();
let cacheHits = 0;
let cacheMisses = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL
const MAX_CACHE_SIZE = 500;

// Circuit Breaker State
let circuitBreakerState: CircuitBreakerState = 'CLOSED';
let consecutiveFailures = 0;
let lastFailureTimestamp = 0;
const FAILURE_THRESHOLD = 3;
const COOLING_PERIOD_MS = 30000; // 30 seconds cooling period

/**
 * Normalizes coordinate pairs to 4 decimal places (~11m resolution)
 * and generates a unique cache key.
 */
function getCacheKey(origin: GeoLocation, destination: GeoLocation, mode: TransportMode): string {
  const oLat = origin.latitude.toFixed(4);
  const oLon = origin.longitude.toFixed(4);
  const dLat = destination.latitude.toFixed(4);
  const dLon = destination.longitude.toFixed(4);
  return `${oLat},${oLon}->${dLat},${dLon}:${mode}`;
}

/**
 * Returns operational route cache statistics.
 */
export function getRouteCacheStats(): RouteCacheStats {
  const total = cacheHits + cacheMisses;
  return {
    size: routeCache.size,
    hits: cacheHits,
    misses: cacheMisses,
    hitRatio: total > 0 ? Math.round((cacheHits / total) * 1000) / 1000 : 0,
  };
}

/**
 * Clears the in-memory route cache (for testing and administrative maintenance).
 */
export function clearRouteCache(): void {
  routeCache.clear();
  cacheHits = 0;
  cacheMisses = 0;
}

/**
 * Returns current circuit breaker status.
 */
export function getCircuitBreakerStatus(): {
  state: CircuitBreakerState;
  failures: number;
  lastTripTime?: string;
} {
  // Check if cooling period has elapsed for OPEN circuit
  if (circuitBreakerState === 'OPEN') {
    if (Date.now() - lastFailureTimestamp > COOLING_PERIOD_MS) {
      circuitBreakerState = 'HALF_OPEN';
    }
  }

  return {
    state: circuitBreakerState,
    failures: consecutiveFailures,
    lastTripTime: lastFailureTimestamp > 0 ? new Date(lastFailureTimestamp).toISOString() : undefined,
  };
}

/**
 * Resets circuit breaker to closed state (for testing and manual operator recovery).
 */
export function resetCircuitBreaker(): void {
  circuitBreakerState = 'CLOSED';
  consecutiveFailures = 0;
  lastFailureTimestamp = 0;
}

/**
 * Manually trips the circuit breaker to OPEN state (for testing resilience).
 */
export function tripCircuitBreakerForTesting(): void {
  circuitBreakerState = 'OPEN';
  consecutiveFailures = FAILURE_THRESHOLD;
  lastFailureTimestamp = Date.now();
}

/**
 * Calculates Haversine great-circle distance between two coordinates in kilometers.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Generates an interpolated geodesic polyline between two points for map rendering
 * when live routing geometries are unavailable.
 */
function generateInterpolatedPolyline(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  steps = 8
): [number, number][] {
  const line: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = lat1 + (lat2 - lat1) * t;
    const lon = lon1 + (lon2 - lon1) * t;
    line.push([Math.round(lat * 10000) / 10000, Math.round(lon * 10000) / 10000]);
  }
  return line;
}

/**
 * Decodes an encoded polyline string from OSRM (Google Polyline algorithm format)
 * into an array of [latitude, longitude] pairs.
 */
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

/**
 * Routing Adapter:
 * 1. Checks high-performance in-memory route cache with TTL.
 * 2. Checks circuit breaker state: if OPEN, fast-fails directly to Haversine fallback.
 * 3. Attempts live routing via OSRM public driving API.
 * 4. Falls back deterministically to Haversine with a 1.3x road tortuosity factor if unreachable or timed out.
 */
export async function calculateRoute(
  origin: GeoLocation,
  destination: GeoLocation,
  mode: TransportMode = 'DRIVING'
): Promise<RouteResult> {
  const calculatedAt = new Date().toISOString();

  // Validate coordinates boundaries
  if (
    typeof origin.latitude !== 'number' ||
    typeof origin.longitude !== 'number' ||
    typeof destination.latitude !== 'number' ||
    typeof destination.longitude !== 'number' ||
    isNaN(origin.latitude) ||
    isNaN(origin.longitude) ||
    isNaN(destination.latitude) ||
    isNaN(destination.longitude) ||
    origin.latitude < -90 ||
    origin.latitude > 90 ||
    origin.longitude < -180 ||
    origin.longitude > 180 ||
    destination.latitude < -90 ||
    destination.latitude > 90 ||
    destination.longitude < -180 ||
    destination.longitude > 180
  ) {
    throw new Error(
      'Invalid coordinate inputs: latitudes must be between -90 and 90, longitudes between -180 and 180.'
    );
  }

  // Handle zero-distance edge case (origin == destination)
  if (
    Math.abs(origin.latitude - destination.latitude) < 0.00001 &&
    Math.abs(origin.longitude - destination.longitude) < 0.00001
  ) {
    return {
      origin,
      destination,
      distanceKm: 0,
      durationMins: 0,
      routeSource: 'OSRM_LIVE',
      geometryPolyline: [[origin.latitude, origin.longitude]],
      sourceAttribution: 'Origin and destination are identical; zero transit required.',
      calculatedAt,
    };
  }

  // ----------------------------------------------------
  // STEP 1: In-Memory Cache Lookup
  // ----------------------------------------------------
  const cacheKey = getCacheKey(origin, destination, mode);
  const now = Date.now();
  const cached = routeCache.get(cacheKey);

  if (cached) {
    if (cached.expiresAt > now) {
      cacheHits++;
      return {
        ...cached.result,
        routeSource: 'OSRM_CACHED',
        sourceAttribution: 'Served from high-performance in-memory geospatial cache (verified OSRM polyline).',
        calculatedAt,
      };
    } else {
      routeCache.delete(cacheKey);
    }
  }

  cacheMisses++;

  // ----------------------------------------------------
  // STEP 2: Circuit Breaker Inspection
  // ----------------------------------------------------
  const cb = getCircuitBreakerStatus();
  const allowLiveCall = cb.state === 'CLOSED' || cb.state === 'HALF_OPEN';

  // ----------------------------------------------------
  // STEP 3: Live OSRM Routing Attempt (if allowed by Circuit Breaker)
  // ----------------------------------------------------
  if (allowLiveCall) {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=simplified&geometries=polyline`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(osrmUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'TeleFollowUpOrchestrator-Member4/1.0',
        },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const primaryRoute = data.routes[0];
          const distanceKm = Math.round((primaryRoute.distance / 1000) * 10) / 10;
          const durationMins = Math.round(primaryRoute.duration / 60);

          let geometry: [number, number][] = [];
          if (typeof primaryRoute.geometry === 'string') {
            geometry = decodePolyline(primaryRoute.geometry);
          } else if (Array.isArray(primaryRoute.geometry?.coordinates)) {
            geometry = primaryRoute.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
          }

          const liveResult: RouteResult = {
            origin,
            destination,
            distanceKm,
            durationMins,
            routeSource: 'OSRM_LIVE',
            geometryPolyline:
              geometry.length > 0
                ? geometry
                : generateInterpolatedPolyline(
                    origin.latitude,
                    origin.longitude,
                    destination.latitude,
                    destination.longitude
                  ),
            sourceAttribution: 'Calculated via Open Source Routing Machine (OSRM).',
            calculatedAt,
          };

          // On successful live call: Reset circuit breaker to CLOSED
          circuitBreakerState = 'CLOSED';
          consecutiveFailures = 0;

          // Store in route cache (LRU eviction if at capacity)
          if (routeCache.size >= MAX_CACHE_SIZE) {
            const firstKey = routeCache.keys().next().value;
            if (firstKey) routeCache.delete(firstKey);
          }
          routeCache.set(cacheKey, {
            result: liveResult,
            expiresAt: now + CACHE_TTL_MS,
          });

          return liveResult;
        }
      }
      
      // If response not ok or data invalid, record failure
      recordCircuitBreakerFailure();
    } catch {
      // Failed or timed out
      recordCircuitBreakerFailure();
    }
  }

  // ----------------------------------------------------
  // STEP 4: Deterministic Fallback (Haversine + 1.3x road tortuosity factor)
  // ----------------------------------------------------
  const straightLineKm = calculateHaversineDistanceKm(
    origin.latitude,
    origin.longitude,
    destination.latitude,
    destination.longitude
  );

  const adjustedDistanceKm = Math.round(straightLineKm * 1.3 * 10) / 10;
  const avgSpeedKmh = mode === 'PUBLIC_TRANSIT' ? 40 : 55;
  const estimatedDurationMins = Math.max(15, Math.round((adjustedDistanceKm / avgSpeedKmh) * 60));

  const fallbackResult: RouteResult = {
    origin,
    destination,
    distanceKm: adjustedDistanceKm,
    durationMins: estimatedDurationMins,
    routeSource: 'ESTIMATED_HAVERSINE_ROAD_FACTOR',
    geometryPolyline: generateInterpolatedPolyline(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude
    ),
    sourceAttribution:
      'Deterministic Haversine calculation (with 1.3x empirical road tortuosity factor). Live routing service unconfigured or offline.',
    calculatedAt,
    warning:
      cb.state === 'OPEN'
        ? 'Circuit breaker OPEN: External routing API recently failed or timed out. Served via instant geometric fallback to maintain zero latency.'
        : 'Live OSRM routing was unreachable or rate-limited. Distance and duration are geometric estimates and do not reflect real-time traffic conditions.',
  };

  return fallbackResult;
}

function recordCircuitBreakerFailure(): void {
  consecutiveFailures++;
  lastFailureTimestamp = Date.now();
  if (consecutiveFailures >= FAILURE_THRESHOLD) {
    circuitBreakerState = 'OPEN';
  }
}
