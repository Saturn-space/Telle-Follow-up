// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - GEOCODING SERVICE ADAPTER (PHASE 3)
// Compliant OpenStreetMap Nominatim Client with Rate Limiting, Caching & Fallbacks
// ============================================================================

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
  source: 'NOMINATIM_OSM' | 'CACHE' | 'REGIONAL_CENTROID_FALLBACK';
  isApproximate: boolean;
}

// In-memory cache for repeated geocoding requests to respect OSM Nominatim policy
const GEOCODE_CACHE = new Map<string, GeocodingResult>([
  ['bengaluru', { latitude: 12.9716, longitude: 77.5946, displayName: 'Bengaluru, Karnataka, India', source: 'CACHE', isApproximate: false }],
  ['bangalore', { latitude: 12.9716, longitude: 77.5946, displayName: 'Bengaluru, Karnataka, India', source: 'CACHE', isApproximate: false }],
  ['indiranagar', { latitude: 12.9719, longitude: 77.6412, displayName: 'Indiranagar, Bengaluru, Karnataka, India', source: 'CACHE', isApproximate: false }],
  ['koramangala', { latitude: 12.9352, longitude: 77.6245, displayName: 'Koramangala, Bengaluru, Karnataka, India', source: 'CACHE', isApproximate: false }],
  ['mumbai', { latitude: 19.0760, longitude: 72.8777, displayName: 'Mumbai, Maharashtra, India', source: 'CACHE', isApproximate: false }],
  ['bandra', { latitude: 19.0596, longitude: 72.8295, displayName: 'Bandra, Mumbai, Maharashtra, India', source: 'CACHE', isApproximate: false }],
  ['andheri', { latitude: 19.1136, longitude: 72.8697, displayName: 'Andheri, Mumbai, Maharashtra, India', source: 'CACHE', isApproximate: false }],
  ['new delhi', { latitude: 28.6139, longitude: 77.2090, displayName: 'New Delhi, Delhi, India', source: 'CACHE', isApproximate: false }],
  ['delhi', { latitude: 28.6139, longitude: 77.2090, displayName: 'New Delhi, Delhi, India', source: 'CACHE', isApproximate: false }],
  ['saket', { latitude: 28.5244, longitude: 77.2167, displayName: 'Saket, New Delhi, Delhi, India', source: 'CACHE', isApproximate: false }],
  ['chennai', { latitude: 13.0827, longitude: 80.2707, displayName: 'Chennai, Tamil Nadu, India', source: 'CACHE', isApproximate: false }],
]);

// Track last request time to strictly enforce Nominatim's 1-request-per-second limit
let lastRequestTimestamp = 0;

export async function forwardGeocodeAddress(
  query: string
): Promise<GeocodingResult | null> {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery || normalizedQuery.length < 2) {
    return null;
  }

  // 1. Check cache first
  if (GEOCODE_CACHE.has(normalizedQuery)) {
    return GEOCODE_CACHE.get(normalizedQuery)!;
  }

  // 2. Enforce 1-second interval to comply with Nominatim Acceptable Use Policy
  const now = Date.now();
  const timeSinceLast = now - lastRequestTimestamp;
  if (timeSinceLast < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - timeSinceLast));
  }
  lastRequestTimestamp = Date.now();

  try {
    const serviceUrl = process.env.GEOCODING_SERVICE_URL || 'https://nominatim.openstreetmap.org';
    const endpoint = `${serviceUrl}/search?format=json&q=${encodeURIComponent(
      query
    )}&limit=1&countrycodes=in`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout

    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'TeleFollowUpOrchestrator-Prototype/1.0 (academic healthcare follow-up study)',
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[Geocoding] Nominatim responded with status ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const first = data[0];
      const result: GeocodingResult = {
        latitude: parseFloat(first.lat),
        longitude: parseFloat(first.lon),
        displayName: first.display_name,
        source: 'NOMINATIM_OSM',
        isApproximate: true, // Tagged approximate to avoid false medical exactness
      };

      // Store in cache
      GEOCODE_CACHE.set(normalizedQuery, result);
      return result;
    }

    return null;
  } catch (err: unknown) {
    // Graceful fallback without breaking search
    const message = err instanceof Error ? err.message : 'Unknown geocoding error';
    console.warn(`[Geocoding] Service query failed: ${message}`);
    return null;
  }
}
