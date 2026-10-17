# Member 4 — Travel Optimization & Escalation Post-Release Maintenance Guide
**System:** Tele-Follow-Up Orchestrator — An AI-Assisted Post-Surgical Follow-Up Coordination System  
**Module:** Member 4 (Travel Comparison, Routing Engine, Transparent Scenario Costs, and Safety Escalation)  
**Phase:** Phase 5 — Post-Release Maintenance, Reliability & Operational Monitoring  
**Feature Branch:** `feature/member-4-phase-5-maintenance`  
**Monorepo Target:** `Saturn-space/Telle-Follow-up`

---

## 1. Executive Summary & Maintenance Objectives

Following the Phase 4 release validation, Phase 5 establishes long-term operational resilience, latency optimization, fault tolerance, and zero-PHI observability for the travel optimization vertical slice. 

The primary maintenance objectives implemented and verified in this phase:
1. **High-Performance Geospatial Caching:** An in-memory route cache with 15-minute TTL and 4-decimal coordinate clustering eliminates redundant network calls, shields against public routing rate-limits, and slashes query response times to $<1\text{ ms}$.
2. **Circuit Breaker Resiliency:** Protects user experience against external API outages. After 3 consecutive timeouts/failures, the circuit breaker enters `OPEN` state, immediately serving requests via the deterministic Haversine fallback with zero network timeout latency.
3. **Operational Health & Diagnostics API:** Exposes `GET /api/travel/health` with active probing capabilities, tracking circuit breaker state, cache hit ratio, and component readiness.
4. **Zero-PHI Telemetry:** Aggregates real-time patient impact metrics (aggregate km saved, travel duration reduced, emergency escalations handled) with a verified zero-PHI audit guarantee.
5. **Interactive Operations Dashboard:** Equips coordinators with a real-time reliability panel in the web interface.

---

## 2. Architectural Resilience & Failure Mitigation

The routing subsystem operates on a **three-tier redundancy hierarchy**:

```
Client Comparison Request
        │
        ▼
[Tier 1: In-Memory Geospatial Cache]
  ├── Hit (TTL < 15m) ──► Instant Return (tag: OSRM_CACHED, ~0ms latency)
  └── Miss ──┐
             ▼
[Tier 2: Circuit Breaker Inspection]
  ├── OPEN State ───────► Fast Failover to Tier 3 (no timeout penalty)
  └── CLOSED / HALF_OPEN
             ▼
[Live OSRM Routing Engine (3500ms Timeout)]
  ├── Success ──────────► Populate Cache + Reset Circuit Breaker ──► Return OSRM_LIVE
  └── Failure / Timeout ─► Record CB Failure (3 trips = OPEN) ──┐
                                                                 ▼
[Tier 3: Deterministic Haversine Fallback + 1.3x Road Tortuosity Factor]
  └── Always Succeeds ──► Returns ESTIMATED_HAVERSINE_ROAD_FACTOR + Warning Notice
```

### 2.1 Caching Policy & Normalization
* **Coordinate Clustering:** GPS coordinates fluctuate slightly between mobile requests. Coordinates are rounded to 4 decimal places ($\sim 11\text{ meters}$ ground resolution), avoiding duplicate routing queries for identical physical buildings.
* **TTL & Eviction:** Cache entries expire after 15 minutes (`CACHE_TTL_MS = 900,000`). If cache capacity exceeds 500 entries, the oldest keys are automatically evicted (LRU policy).
* **Cache Key Format:** `${originLat},${originLon}->${destLat},${destLon}:${mode}`.

### 2.2 Circuit Breaker Parameters
* **Failure Threshold:** 3 consecutive failed requests or timeouts ($>3500\text{ ms}$).
* **Cooling Period:** 30 seconds (`COOLING_PERIOD_MS = 30,000`).
* **Half-Open Probe:** After 30s in `OPEN` state, the circuit breaker transitions to `HALF_OPEN`. The next incoming request acts as a trial probe. If successful, the circuit breaker resets to `CLOSED`; if unsuccessful, it reverts to `OPEN` for another cooling window.

---

## 3. Operational Monitoring & Health Endpoint

The system provides automated monitoring via `GET /api/travel/health`.

### 3.1 Endpoint Specification

* **URL:** `/api/travel/health`
* **Method:** `GET`
* **Query Parameters:**
  * `probe=true` *(optional)*: Forces an active lightweight reachability probe to `router.project-osrm.org`.

### 3.2 Sample Response (`HTTP 200 OK`)

```json
{
  "status": "HEALTHY",
  "timestamp": "2026-10-17T20:28:47.000Z",
  "uptimeSeconds": 1420,
  "module": {
    "name": "Member 4: Travel Optimization & Escalation",
    "phase": "Phase 5: Post-Release Maintenance & Operational Reliability",
    "version": "1.2.0"
  },
  "checks": {
    "dataStore": {
      "status": "HEALTHY",
      "seededPatients": 3,
      "seededProviders": 6,
      "activeComparisonsCount": 14,
      "activeEscalationsCount": 2
    },
    "clinicalSafetyGate": {
      "status": "HEALTHY",
      "circuitBreakerArmed": true,
      "emergencyOverrideActive": true,
      "missingRiskClearanceProtection": true,
      "unassessedAssumptionOverride": "NEVER_ASSUME_LOW_RISK"
    },
    "geospatialRouting": {
      "status": "HEALTHY",
      "circuitBreaker": {
        "state": "CLOSED",
        "failures": 0
      },
      "message": "Routing service and cache fully operational.",
      "cache": {
        "size": 6,
        "hits": 18,
        "misses": 4,
        "hitRatio": 0.818
      }
    }
  },
  "telemetry": {
    "totalComparisons": 14,
    "completedComparisons": 12,
    "escalatedComparisons": 2,
    "totalDistanceSavedKm": 5840.8,
    "totalTimeSavedMins": 5760,
    "routeSources": {
      "osrmLive": 4,
      "osrmCached": 18,
      "haversineFallback": 0
    }
  }
}
```

---

## 4. Zero-PHI Privacy & Compliance Audit

Under HIPAA and healthcare privacy regulations, telemetry must never retain protected health information (PHI). 

The Phase 5 telemetry implementation enforces strict privacy controls:
* **Excluded Data:** Patient legal names, dates of birth, surgical history details, clinician notes, emergency red-flag descriptions, and exact home addresses are **never** logged to telemetry.
* **Permitted Aggregates:** Total comparison counts, distance savings tallies (km), duration savings (mins), cache efficiency ratios, and circuit breaker failure counts.
* **Audited Verification:** Verified via automated unit test `Group 12: Phase 5 Operational Telemetry & Zero-PHI Compliance`, confirming that serialized telemetry outputs are 100% free of sensitive strings.

---

## 5. Incident Response & Troubleshooting Runbook

| Incident | Root Cause | Observable Symptom | Automated Recovery / Runbook Action |
| :--- | :--- | :--- | :--- |
| **OSRM Outage / Rate Limit** | Public routing engine down or returning HTTP 429 | Route source labeled `ESTIMATED_HAVERSINE_ROAD_FACTOR` | Circuit breaker trips to `OPEN`. Instant fallback engages with zero latency penalty. Operator can configure a dedicated self-hosted OSRM or OpenRouteService instance in `.env.local` via `ROUTING_SERVICE_URL`. |
| **Map Tiles Not Loading** | Client firewall blocks OpenStreetMap CDN | Grey canvas in map container | The SSR-safe `LeafletMapContainer` displays an inline non-blocking notice. Comparison matrix, cost breakdown, and emergency banners remain 100% interactive. |
| **Stale Clinical Assessment** | Assessment timestamp $>48\text{ hours}$ old | Amber advisory banner displayed in UI | Travel estimates are provided for logistical planning, but flagged with a warning requiring fresh clinician assessment before finalized booking. |
| **Missing Clinical Assessment** | Patient record lacks risk evaluation | Purple "Action Required" banner displayed | System marks risk as `UNASSESSED_OR_MISSING` and enforces `isEscalated: false` but **never assumes low risk**. Travel clearance is withheld until a clinical evaluation is entered. |
| **Emergency Dehiscence / Sepsis** | Critical red flags or high fever detected | Emergency red banner + cost formulas disabled | Clinical circuit breaker locks comparison. Direct triage to nearest 24/7 ER is mandated. Cost savings calculations are strictly disabled. |

---

## 6. Cross-Member Integration Contracts

| Upstream / Downstream Member | Shared Contract | Integration Touchpoint | Maintenance Action |
| :--- | :--- | :--- | :--- |
| **Member 1 (Patient Context)** | `PatientTravelContext` | `req.origin`, `daysPostOp`, `mobilityConstraint` | Ingests origin coordinates for distance modeling. |
| **Member 2 (Clinical Risk)** | `ClinicalRiskContext` | `urgencyLevel`, `redFlags`, `isStale` | Enforces emergency escalation circuit breaker. |
| **Member 3 (Provider Directory)** | `CandidateProvider` | `provider.location`, `supportedServices` | Filters facilities lacking required post-op service codes. |
| **Member 5 (Follow-Up Coordination)** | `DestinationComparisonOption` | Handoff via `onProceedToFollowUpPlan` | Delivers recommended facility, distance, and route geometry for teleconsultation booking. |

---

## 7. Automated Test Suite Verification

Run the comprehensive 52-test test suite:

```bash
npx tsx tests/travel-module.test.ts
```

**Test Coverage Summary:**
* **Group 1:** Coordinate boundary validation (-90 to +90, -180 to +180) — 3 tests
* **Group 2:** Haversine distance, OSRM live routing, and polyline generation — 4 tests
* **Group 3:** Cost calculation formulas, lodging allowances, and missing input handling — 6 tests
* **Group 4:** Clinical emergency escalation circuit breaker and cost suppression — 7 tests
* **Group 5:** Healthcare service eligibility screening and filtering — 2 tests
* **Group 6:** Zod schema validation for POST payloads — 3 tests
* **Group 7:** Safety hardening for missing and stale clinical risk records — 5 tests
* **Group 8:** Coordinate boundary edge cases and zero-distance routing — 3 tests
* **Group 9:** Cost calculation boundary conditions and negative rates — 2 tests
* **Group 10:** Phase 5 route caching, TTL, and 4-decimal key normalization — 5 tests
* **Group 11:** Phase 5 circuit breaker state transitions, fast failover, and restoration — 5 tests
* **Group 12:** Phase 5 operational telemetry aggregation and zero-PHI audit — 6 tests
* **Group 13:** Phase 5 high-concurrency stress testing without state corruption — 1 test

**Verification Result:** `TOTAL TESTS: 52 | PASSED: 52 | FAILED: 0` (100% Success).
