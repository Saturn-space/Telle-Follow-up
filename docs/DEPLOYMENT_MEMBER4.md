# Member 4 — Travel Optimization & Escalation Deployment & Release Guide
**System:** Tele-Follow-Up Orchestrator  
**Component:** Member 4 (Travel Comparison, Routing, Scenario Costs, and Safety Escalation)  
**Release Target:** Monorepo Integration & Production Staging  
**Branch:** `feature/member-4-phase-4-release`

---

## 1. Runtime Requirements & Dependencies
* **Node.js:** v20.x or v22.x LTS
* **Package Manager:** npm (v10+) or Bun
* **Framework:** Next.js 15.5+ (App Router), React 19, TypeScript 5.9
* **Styling:** Tailwind CSS v4, PostCSS, Lucide React
* **Geospatial & Mapping:** Leaflet v1.9.4, `@types/leaflet` v1.9.22
* **Validation:** Zod v4.6+

---

## 2. Environment Configuration
The module operates safely with zero mandatory paid credentials. All external routing calls are protected by graceful fallbacks.

Create `.env.local` or configure container environment variables:

```bash
# Optional External Routing Engine (Defaults to public OSRM / Haversine fallback)
ROUTING_SERVICE_URL="https://router.project-osrm.org"
ROUTING_TIMEOUT_MS="3500"

# Currency and Rate Configuration (Defaults to INR @ 12.00/km driving)
TRAVEL_COST_CURRENCY="INR"
TRAVEL_COST_RATE_DRIVING="12.0"
TRAVEL_COST_RATE_TRANSIT="3.5"
TRAVEL_COST_RATE_TAXI="18.0"

# Shared PostgreSQL Connection (for coordinated Prisma schema migrations)
DATABASE_URL="postgresql://teleuser:telepassword@localhost:5432/telefollowup?schema=public"
```

---

## 3. Build & Deployment Commands

### Local Development:
```bash
npm install
npm run dev
# Serves on http://localhost:3000
```

### Production Build:
```bash
npm run build
npm run start
# Verifies standalone Next.js production server
```

### Verification & Automated Testing:
```bash
npx tsx tests/travel-module.test.ts
# Executes all 35 unit, geospatial, cost, and safety-override tests
npm run lint
# Verifies strict zero-error, zero-warning ESLint conformance
```

---

## 4. API Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/travel/compare` | Evaluates travel options, calculates distance & duration, runs cost model, and enforces clinical emergency escalation. |
| `GET` | `/api/travel/comparisons/:id` | Retrieves previously audited travel comparison record by comparison ID. |
| `POST` | `/api/travel/escalations` | Immutably records emergency clinical escalation events and resolves nearest 24/7 trauma centers. |
| `GET` | `/api/travel/providers/:id` | Ingests Member 3 provider details, verified coordinates, and service capabilities. |
| `GET` | `/api/travel/patients` | Ingests Member 1 patient profile baselines and Member 2 clinical risk state. |

---

## 5. Health Checks & Verification
* **API Health Check:** Query `GET /api/travel/patients` $\rightarrow$ Expect `HTTP 200 OK` with JSON payload containing seeded patient contexts and active clinical risk states.
* **Routing Fallback Verification:** If outbound HTTP traffic to `router.project-osrm.org` is restricted by network firewalls, verify that route results return with tag `ESTIMATED_HAVERSINE_ROAD_FACTOR` without service interruption.
* **Emergency Escalation Circuit Breaker:** Submit `simulateClinicalUrgency: "CRITICAL"` $\rightarrow$ Verify response status `ESCALATED`, recommendation `EMERGENCY_ESCALATION`, and `costEstimate: null`.

---

## 6. Rollback & Troubleshooting
* **Map Tile Loading Failure:** If client browsers cannot reach `tile.openstreetmap.org`, the SSR-safe `LeafletMapContainer` displays a non-blocking fallback notice while preserving the comparison matrix, cost formulas, and emergency banners.
* **Reverting to Stable Baseline:** To revert changes, checkout the verified Phase 3 tag or branch `feature/member-4-phase-3-hardening`.
