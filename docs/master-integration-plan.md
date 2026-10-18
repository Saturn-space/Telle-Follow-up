# Tele-Follow-Up Orchestrator — Master Integration Architecture & Plan

**Document Version:** 2.0 (Post-Audit Master Integration)  
**System Status:** Consolidated Prototype  
**Scope:** Integration of Five Vertical Modules into One Production-Grade System

---

## 1. Audited Baseline Architecture & Initial Status

The Tele-Follow-Up Orchestrator was initially developed as five disconnected vertical slices:
1. **Patient Intake & Recovery Telemetry**: Patient registration, vital signs, wound symptoms, post-op telemetry ingestion.
2. **AI-Assisted Clinical Decision Support (CDS)**: Rule-based & heuristic post-surgical risk stratification, vital signs bounds checking, doctor sign-offs.
3. **Healthcare Provider Discovery**: Verified facility search, medical service categories, emergency capability filtering, geocoding.
4. **Safety-Aware Travel Optimization**: Long-distance return travel vs. local facility comparison, clinical safety override on emergency escalation.
5. **Care Coordination & Teleconsultation**: Follow-up plans, appointment scheduling, Jitsi video session generation, zero-PII room generation.

### Baseline Deficiencies Identified & Addressed:
- **Disjointed Database Schemas**: Multiple competing schemas were unified into a canonical Prisma model (`backend/prisma/schema.prisma` and `prisma/schema.prisma`).
- **Developer-Specific Artifacts & Labels**: Eliminated user-visible labels such as "Member 1", "Member 2", "Member 3", "Member 4", "Member 5", "Phase 2", "Phase 4", and developer feature branches from navigation, headers, toasts, and triage cards. Replaced with canonical product terminology:
  - *Patient Dashboard*
  - *Recovery Tracker*
  - *Recovery Assessment*
  - *Healthcare Directory*
  - *Travel Options*
  - *Follow-Up Appointments*
  - *Orchestration Pipeline Hub*
- **Merge Conflict Residue**: Repaired syntax issues and duplicated root components in `app/page.tsx`, `frontend/src/app/page.tsx`, and `hooks/use-mobile.ts`.

---

## 2. Module Inventory & Feature Classification

| Functional Area | Source Locations | Integration Status | Description |
| :--- | :--- | :--- | :--- |
| **Authentication & RBAC** | `backend/src/controllers/auth.controller.ts`, `backend/src/middleware/auth.middleware.ts`, `context/AuthContext.tsx` | **Implemented & Verified** | JWT + bcrypt authentication, role enforcement (`PATIENT`, `CLINICIAN`, `COORDINATOR`, `ADMIN`), rate limiting, security headers. |
| **Patient Profile & Recovery Tracker** | `app/patients/recovery-log/page.tsx`, `app/patients/dashboard/page.tsx`, `backend/src/controllers/recovery.controller.ts` | **Implemented & Verified** | Ingests vitals (temp, heart rate, BP), pain scale (0-10), redness, swelling, drainage. Emits structured payloads. |
| **AI Risk Assessment** | `app/risk-assessment/triage/page.tsx`, `components/risk/`, `lib/risk/`, `backend/src/controllers/risk.controller.ts` | **Implemented & Verified** | Clinical decision support engine, red flag detection, doctor note sign-offs, automated routing to travel escalation on critical risk. |
| **Healthcare Directory** | `app/discovery/page.tsx`, `components/discovery/`, `lib/directory/`, `backend/src/controllers/provider.controller.ts` | **Implemented & Verified** | Search and filter facilities by city, service type, and emergency capability. Verified facility badges. |
| **Travel Options & Transit Optimization** | `app/travel-comparison/`, `components/travel/`, `lib/travel/`, `backend/src/controllers/travel.controller.ts` | **Implemented & Verified** | Transit cost/distance/strain comparison. Clinical safety override immediately directs patients to emergency care when critical symptoms occur. |
| **Care Coordination & Appointments** | `app/follow-ups/my-appointments/page.tsx`, `components/followup/`, `backend/src/controllers/appointment.controller.ts` | **Implemented & Verified** | Local clinic visits, teleconsultation scheduling, post-op care plans, notification tracking. |
| **Teleconsultation Suite** | `components/followup/TeleconsultationModal.tsx`, `lib/teleconsultation/` | **Implemented & Verified** | Secure Jitsi Meet integration with cryptographically random room IDs and zero PII in URLs. |
| **Payments & Billing** | `components/followup/PaymentsView.tsx` | **Simulated / Optional** | Razorpay mock workflow clearly labeled as simulated sandbox. Core clinical flows remain unblocked without live keys. |

---

## 3. Module-to-File Mapping & Structural Organization

```
Telle-Follow-up/
├── app/                                # Next.js App Router (Unified Client Routes)
│   ├── page.tsx                        # Main Orchestration Hub
│   ├── discovery/                      # Healthcare Directory & Facility Finder
│   ├── follow-ups/my-appointments/     # Care Coordination & Follow-Up Appointments
│   ├── patients/dashboard/             # Patient Recovery Dashboard
│   ├── patients/recovery-log/          # Daily Recovery Tracker
│   ├── risk-assessment/triage/         # Clinical Decision Support & Risk Stratification
│   └── travel-comparison/              # Safety-Aware Travel Options & Approvals
├── backend/                            # Canonical Node.js / Express Backend
│   ├── src/
│   │   ├── server.ts                   # Express server entry point (Port 5000)
│   │   ├── routes/                     # REST API routers (/api/v1/...)
│   │   ├── controllers/                # Business logic & request handling
│   │   ├── middleware/                 # Auth, RBAC, Rate Limiting, Error Handling
│   │   └── database/                   # Prisma Client & DB abstraction
│   └── prisma/schema.prisma            # PostgreSQL Data Schema
├── components/                         # Shared UI Design System
│   ├── shared/Sidebar.tsx              # Canonical Role-Based Navigation
│   ├── shared/Toast.tsx                # Accessible Notification System
│   ├── navigation/Header.tsx           # Global Header & Patient Context
│   ├── risk/                           # Risk Stratification Components
│   ├── travel/                         # Travel Comparison & Safety Banners
│   ├── discovery/                      # Facility Cards, Search & Map Overlays
│   └── followup/                       # Care Plans, Appointments & Video
├── lib/                                # Domain Logic, Types & Invariant Safety
│   ├── server/store.ts                 # Resilient Data Store (Prisma + Memory Fallback)
│   ├── travel/comparison-service.ts    # Travel Engine & Clinical Safety Invariants
│   └── types/                          # Shared DTOs and Integration Contracts
└── tests/                              # Comprehensive Automated Test Suites
    ├── api-security-and-hardening.test.ts
    ├── auth-rbac.test.ts
    ├── e2e-workflow.test.ts
    ├── phase5-maintenance-reliability.test.ts
    ├── test-database-offline-safety.test.ts
    └── travel-module.test.ts
```

---

## 4. API Contracts & Ownership Boundaries

All endpoints follow REST conventions under `/api/v1`:

1. **Authentication & Identity (`/api/v1/auth`)**
   - `POST /register`: Registers new user (`PATIENT`, `CLINICIAN`, `COORDINATOR`).
   - `POST /login`: Authenticates with bcrypt hash validation and issues signed JWT.
   - `GET /me`: Returns active session identity without password hashes.

2. **Recovery & Observations (`/api/v1/recovery`)**
   - `GET /logs/:patientId`: Patient-scoped or assigned clinician telemetry retrieval.
   - `POST /logs`: Telemetry ingestion validating temperature, pain score, and surgical wound observations.

3. **Risk Stratification & CDS (`/api/v1/risk`)**
   - `POST /assess`: Triggers deterministic CDS assessment; flags fever, dehiscence, acute pain.
   - `POST /review/:assessmentId`: Clinician sign-off with doctor notes and care recommendations.

4. **Healthcare Providers (`/api/v1/providers`)**
   - `GET /`: Search facilities with city, service category, emergency capacity, and radius filters.
   - `GET /:id`: Detailed facility capability and verification status.

5. **Travel Options & Safety (`/api/v1/travel`)**
   - `POST /compare`: Analyzes travel routes vs. local care. Returns distance, time, and monetary trade-offs.
   - *Clinical Invariant:* If `clinicalUrgency == 'CRITICAL'`, travel cost minimization is rejected; immediate referral to emergency hospital is mandated.

6. **Care Coordination & Consultations (`/api/v1/appointments`)**
   - `GET /`: Appointments filtered by patient and provider.
   - `POST /`: Schedules teleconsultation or in-person clinic visit.
   - `GET /teleconsult/:appointmentId/join`: Generates ephemeral Jitsi Meet room credentials.

---

## 5. Security & RBAC Enforcement

- **RBAC Matrix**:
  - `PATIENT`: Access only to own profile, telemetry logs, appointments, and teleconsultations.
  - `CLINICIAN`: Access to assigned patient telemetry, clinical risk assessments, doctor note sign-offs, and clinical referrals.
  - `COORDINATOR`: Scheduling appointments, directory searches, and travel approvals.
  - `ADMIN`: User management and operational telemetry.
- **Data Protection**:
  - Passwords hashed with bcrypt (salt rounds: 10).
  - Passwords and tokens excluded from API responses and database logs.
  - Teleconsultation rooms use random UUIDs (`tele-followup-[uuid]`) containing no patient identifiers.
  - Safe error handling prevents stack trace disclosure to clients.
