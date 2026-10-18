# Backend and Database Integration Report

**Date:** 2026-10-18  
**Branch:** `feature/updated-ui-redesign`  
**Commit / PR:** None; changes remain uncommitted in the existing working tree.

## 1. Repository structure detected

- **Active project:** root Next.js 15 App Router app, React 19, TypeScript, Tailwind, Vitest, and root-level API handlers.
- **Database:** PostgreSQL through Prisma Client; `prisma/schema.prisma` is the active schema.
- **Legacy copies:** `backend/src/` is a separate Express API, `backend/prisma/schema.prisma` duplicates the root schema, and `frontend/src/` plus nested `Telle-Follow-up/` contain overlapping copies. These are not the root web app's runtime API.
- **Runtime decision:** the baseline README identified Next API routes as the backend. The root app remains canonical; its `/api/v1` rewrite was removed and the Express entrypoint was retired so the web app does not depend on a second API process. The legacy Express implementation is retained but not integrated or certified by this report.

## 2. Existing architecture and changes

Root Next pages and API handlers now share the same app runtime and same-origin API client. The active operational API handlers use the root Prisma client. Environment and migration scripts target only the root Prisma schema. Setup instructions no longer reset a database or write sample clinical accounts.

The working tree already contained broad uncommitted work when this audit ran. No branch switch, commit, merge, or pull request was made. The user's existing redesign in `app/page.tsx` was preserved.

## 3. Backend routes integrated

Root API route groups are:

- `/api/auth/*`, `/api/admin/*`, `/api/clinician/*`, `/api/coordinator/*`
- `/api/patients/[patientId]/recovery-logs`, `/api/patients/[patientId]/risk-assessments`
- `/api/risk-assessments/*`, `/api/providers/*`, `/api/referrals`
- `/api/travel/*`, `/api/followup/*`, `/api/teleconsult/*`
- `/api/payments/*`, `/api/notifications`, `/api/documents/*`
- `/api/integration/cross-module`, `/api/docs/openapi`

The route set is statically type-checked. No active `app/api/` route references `lib/server/store`, seeded comparisons, or seeded patient records. The older Express routes remain legacy source and are not exercised by the root runtime.

## 4. Database models and relationships

The root schema contains `User`, `Patient`, `SurgeryRecord`, `RecoveryLog`, `RiskAssessment`, `RiskFactor`, `ClinicalAlert`, `ClinicianReview`, `HealthcareFacility`, `FacilityService`, `ProviderVerificationRecord`, `CareReferral`, `Provider`, `TravelComparison`, `FollowUpPlan`, `Appointment`, `TeleconsultationSession`, `ConsultationRecord`, `PaymentOrder`, `Notification`, `MedicalDocument`, and `AuditLog`, with enums for roles, review states, facility verification, appointments, sessions, payments, documents and audit actions.

Important relations include:

- `RiskAssessment.patientId` and optional `recoveryLogId` reference the patient and evaluated recovery entry.
- Follow-up plans reference the patient and optional reviewed risk/travel records.
- Appointments reference the same patient and plan, plus an optional facility.
- Teleconsultation sessions and consultation records reference appointments; payment orders reference plan, optional appointment and optional user.
- Document metadata references the patient; encrypted file bytes live on a private filesystem path rather than PostgreSQL.

The duplicate legacy backend Prisma schema remains in the repository but is not used by the root scripts or application.

## 5. Prisma validation, generation and migration

- **PASS — `npx prisma validate --schema prisma/schema.prisma`:** root schema is valid.
- **PASS — `npx prisma generate --schema prisma/schema.prisma`:** Prisma Client generated into ignored `generated/prisma`, avoiding the locked package client DLL.
- **NOT RUN — migration application/status after schema addition:** the repository contains the initial schema and clinician-registration migrations. Neither was applied to the configured database because its target and baseline ownership were not established.
- **NOT RUN — persistence round trip:** no isolated development/test database was established for create/read/restart verification.

The initial migration was generated from the root schema after the repository audit found no root migration history. It has not been applied.

## 6. Authentication and authorization

- Root login verifies bcrypt password hashes; patient self-registration creates patient accounts only.
- Doctors can submit an application with professional details. Its password is hashed and access remains pending until an administrator reviews the license and approves the application. The form does not validate licenses against an external registry.
- Sessions are signed JWTs set in an HTTP-only `teleflow_session` cookie. The API also accepts a signed bearer token for server clients.
- Protected root handlers reload the current account role and patient profile from PostgreSQL. A stale token no longer keeps a role after the database account changes.
- `x-user-role` and `x-user-id` headers do not authenticate callers. Patient access is scoped by the linked patient profile. Clinician access checks assignments/reviews.
- Admin role changes and provider verification are protected. The initial admin bootstrap requires explicit environment-supplied credentials and does not create clinical demo data.
- **NOT IMPLEMENTED:** self-service password reset. The page now reports that reset tokens and email delivery are unavailable.
- **LEGACY RISK:** the retired Express code still contains its older auth middleware and route behavior. Do not re-enable its entrypoint or expose `/api/v1` without a separate security and persistence migration.

## 7. Frontend API connections

Patient dashboard, recovery log, risk triage, travel selection/comparison, follow-up appointments, clinician/coordinator dashboards, provider discovery, teleconsultation, payment history, and document upload/download use root same-origin APIs. Fake patient/clinician role selectors and role headers were removed from active flows. Forms display unavailable or error states when the backend/provider is unavailable. Payments/documents use the global shell once; profile and coordinator views now show saved values or missing-data states instead of static patient fixtures.

## 8. Five module integration status

| Module | Code integration | Runtime persistence verification |
|---|---|---|
| Patient recovery | **PASS** — patient-scoped RecoveryLog API and profile-based access | **NOT RUN** — isolated DB write/read check unavailable |
| Risk assessment | **PASS** — evaluates saved recovery data and persists assessment/factors linked to the log; clinician review is separate | **NOT RUN** — DB write/read and reviewer workflow not exercised against an isolated database |
| Provider discovery | **PASS** — Prisma facility/service queries; verified-state filtering and admin verification | **NOT RUN** — no production-like provider directory DB configured for verification |
| Travel optimization | **PASS** — server-derived patient city and reviewed risk; verified service-matched facilities; comparison persisted | **NOT RUN** — no isolated database or external routing validation |
| Follow-up/teleconsultation | **PASS** — plans, appointments, sessions, consultation records and notifications use Prisma relations | **NOT RUN** — DB lifecycle/restart test not available |

Razorpay payments are optional and disabled by default. Their routes use server-side credentials, signature checks and PostgreSQL records; provider availability is configuration-dependent. A captured payment does not confirm an appointment or gate care.

## 9. Recovery-to-risk flow

**PASS — static integration:** recovery entry API persists a patient-scoped log; risk evaluation loads persisted recovery data and records a `RiskAssessment` associated with that log. Risk review is stored as a separate clinician decision. **NOT RUN — PostgreSQL persistence/restart test.**

## 10. Risk-to-travel flow

**PASS — contract and code path:** travel comparison does not accept client-supplied origin or simulated urgency. It loads patient location from the patient profile, requires a recent clinician-reviewed risk assessment, restricts candidates to verified facilities with matching services, and persists a comparison. High/escalated states use the emergency path. Route/cost values remain estimates. **NOT RUN — isolated DB workflow test or live routing-provider check.**

## 11. Follow-up persistence and consultation status

**PASS — static integration:** care plans require a recent reviewed risk record; appointment operations validate plan status, time conflicts, patient scope and verified-facility selection; teleconsultation rooms require a scheduled appointment; a room does not mark an appointment complete; clinician outcomes persist separately. In-app notifications are PostgreSQL records. **NOT RUN — DB lifecycle and restart test.**

The external Jitsi provider's connectivity, encryption mode and retention behavior have not been verified. The UI no longer claims the service is connected or that the app guarantees peer-to-peer encryption.

## 12. Test commands and outcomes

- **PASS — `npm test`:** 9 test files passed; 70 passed, 6 skipped. Auth and clinician-registration contract tests use mocked Prisma and do not access the configured database.
- **SKIPPED:** six tests require an isolated PostgreSQL harness for high-risk plan gating and persisted payment webhook capture/failure/idempotency. Old store-backed expectations were not treated as DB persistence.
- **PASS — `npm run lint`:** zero errors; one Next custom-font placement warning in `app/layout.tsx`.
- **PASS — `npx tsc --noEmit`:** exited successfully.
- **PASS — `npx prisma validate --schema prisma/schema.prisma`:** valid root schema.
- **PASS — local demo database:** both migrations were deployed to the dedicated localhost PostgreSQL service and demo records were seeded. Patient, clinician and administrator sign-in succeeded; the patient appointment and READY video room were returned by the APIs. No captured payment was created.
- **NOT RUN — restart durability:** seeded data was read through the application, but PostgreSQL stop/restart persistence was not checked separately. The configured `.env` database was not migrated or seeded.

## 13. Build and type-check results

- **PASS — type check:** `npx tsc --noEmit`.
- **FAIL — last production build:** Next compiled and passed its type phase, then page-data/prerender failed with missing generated artifacts. This predates the clinician-registration/demo additions and was not rerun while development servers were active.
- **PASS — Prisma Client generation:** current schema generates into ignored `generated/prisma`.

## 14. Environment variables and external services

Required for normal database-backed operation:

- `DATABASE_URL` — PostgreSQL connection string.
- `JWT_SECRET` — random signing secret, at least 32 characters.
- `DOCUMENT_STORAGE_KEY` — base64-encoded 32-byte AES-GCM key; losing it makes existing encrypted uploads unreadable.

Optional/configuration-dependent services:

- `ANTHROPIC_API_KEY` for external risk explanation text; deterministic scoring remains available.
- `GEOCODING_SERVICE_URL` for external city geocoding; route estimates can remain approximate.
- `OCR_SERVICE_URL` and `OCR_API_KEY`; OCR requires consent on each upload.
- `PAYMENTS_ENABLED`, Razorpay API credentials and webhook secret; payments remain off unless enabled.
- `JITSI_DOMAIN` for a selected external meeting domain; the default public domain is not a verified provider connection.
- `DOCUMENT_STORAGE_PATH` for a persistent private volume.
- `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` only for the one-time admin bootstrap.

External email delivery is not implemented. The system status endpoint reports configuration/default states, not provider health checks.

## 15. Remaining defects and blockers

1. Confirm the database migration baseline before applying migrations outside the dedicated local `tele_follow_up_demo` database, where both migrations are already applied.
2. No isolated PostgreSQL integration harness is available; six DB-dependent tests are skipped and persistence after restart is unverified.
3. The last production build failed during prerender; rerun it in an isolated environment without concurrent Next/Node build activity.
4. Legacy Express modules, their duplicate schema and direct tests remain separate and are not safe evidence for the active root APIs.
5. Password reset and external email delivery are not implemented.
6. The localhost API reports Razorpay test checkout configured, but order creation, payment capture and webhook delivery were not exercised. The public Jitsi domain needs no app credentials; external connectivity is not verified.

## 16. Git and delivery state

- **Branch:** `feature/updated-ui-redesign`.
- **Commits:** none created.
- **Pull request:** none created.
- Existing uncommitted changes were left in the working tree; no merge into `main` occurred.
