# Healthcare Provider Directory: Data Quality, Reliability & Limitations
**Module:** Member 3 — Local Healthcare Discovery & Coordination  
**System:** Tele-Follow-Up Orchestrator  
**Version:** Phase 3 Hardened Specification  

---

## 1. Purpose & Clinical Scope
The Local Healthcare Provider Directory catalogs accredited community medical clinics, post-surgical recovery centers, wound clinics, and diagnostic centers. Its primary objective is to facilitate safe post-operative care coordination closer to the patient's residence when clinically appropriate, reducing unnecessary travel to distant out-of-state surgical centers.

### Clinical Boundary
- **Decision-Support Only:** The directory never autonomously determines that a patient is fit for local discharge follow-up. Final referral authorization remains strictly with the attending surgical team.
- **Safety Over Convenience:** In cases where post-surgical complications arise (e.g., suspected deep surgical infection, hemorrhage, acute dehiscence), travel cost and proximity optimization are suspended, and emergency surgical escalation takes precedence.

---

## 2. Provider Data Provenance & Quality Tiers

Every facility record in the directory is assigned an immutable data source and verification status:

| Verification Tier | Data Source Badge | Definition & Evidence Standard | UI Label |
|---|---|---|---|
| `VERIFIED` | `OFFICIAL_REGISTRY` or `PARTNER_HEALTH_SYSTEM` | Formally verified against state medical council or clinical establishment registries (e.g., KPME, NABH, JCI). Requires verified license number and timestamped audit record by an authorized coordinator. | `✓ Verified Facility` (Emerald) |
| `SEEDED_DEMO` | `SYNTHETIC_SEED` | High-fidelity synthetic records populated across metropolitan zones for system testing and demonstration. Transparently labeled to prevent confusion with real clinical entities. | `★ Seeded Demo Record` (Amber) |
| `PENDING_REVIEW` | `COMMUNITY_SUBMISSION` | Newly registered facilities undergoing credential review. Services and operating hours are unconfirmed. | `⏳ Pending Verification` (Blue) |
| `UNVERIFIED` | `COMMUNITY_SUBMISSION` | Unchecked facility records with no independent license verification. | `⚠ Unverified Listing` (Slate) |

---

## 3. Mapping & Geocoding Policy Compliance

1. **OpenStreetMap & Leaflet Attribution:**
   - Tile provider: OpenStreetMap standard tiles.
   - Mandatory attribution: `&copy; OpenStreetMap contributors`.
2. **Nominatim Usage Guidelines:**
   - Respects Nominatim's strict 1-request-per-second rate limit using an in-memory throttling queue (`lib/services/geocoding-service.ts`).
   - Identifies itself with a compliant custom `User-Agent` header (`TeleFollowUpOrchestrator-Prototype/1.0`).
   - Implements an in-memory geocoding cache (`GEOCODE_CACHE`) for standard metropolitan cities and neighborhoods, preventing unnecessary repetitive requests.
3. **Graceful Offline Fallback:**
   - If the geocoding service encounters timeouts or rate-limiting responses, the system falls back to regional centroids without crashing or blocking search.
   - If map tiles fail to render, the directory interface automatically offers a seamless switch to List-Only view.

---

## 4. Cross-Module Integration Contracts

### Member 1: Patient Registration & Recovery Intake
- **Contract:** `PatientLocationContext`
- **Data Privacy:** Only high-level geographic location (city, state, postal code, truncated coordinate) is consumed. Detailed patient medical history, exact home address, or personal identifiers are strictly decoupled from directory queries.

### Member 2: AI Risk Assessment & Decision Support
- **Contract:** `RiskGatingContext`
- **Clinical Priority:** If Member 2 flags `emergencyEscalationRequired === true` or risk tier `CRITICAL`, the directory UI activates an emergency escalation alert. Routine clinic visits (e.g. basic dressing clinics) are disabled or flagged with warnings instructing the patient to report directly to an emergency department or the primary operating hospital.

### Member 4: Travel Optimization & Multi-Modal Routing
- **Contract:** `FacilityLocationDTO`
- **Fields Provided:** `{ facilityId, facilityName, facilityType, coordinates: { latitude, longitude }, address, city, state, postalCode, emergencyCapable, servicesAvailable }`.
- **Measurement Boundary:** Member 3 calculates straight-line Haversine distance in kilometers for preliminary proximity filtering. Precise driving, train, or flight transit durations and travel fatigue scores belong strictly to Member 4.

### Member 5: Follow-Up, Teleconsultation & Booking
- **Contract:** `ReferralDispatchDTO`
- **Linkage:** When a clinician dispatches a care referral via `POST /api/referrals`, a unique referral ID (`ref_*`) is created. Member 5 references this ID to associate calendar appointments and follow-up consultation records without duplicating facility entities.

---

## 5. Security & Access Control
- **Public & Patient Read Access:** `GET /api/providers`, `GET /api/providers/:id`, `GET /api/providers/nearby` allow searching and discovering local care.
- **Administrative Operations:** `POST /api/providers`, `PATCH /api/providers/:id`, and `POST /api/providers/:id/verification` require authenticated `ADMIN` or `COORDINATOR` roles via the `x-user-role` header. Unauthorized requests strictly receive `403 Forbidden`.
- **Audit Traceability:** Every verification decision records the verifier user ID, timestamp, official registry license number, and minimum 10-character inspection notes. Direct mutation of verification status via generic update endpoints is blocked.
