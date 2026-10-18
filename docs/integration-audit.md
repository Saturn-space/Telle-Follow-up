# Repository Audit and Integration Status

**Audit date:** 2026-10-18  
**Branch:** `feature/updated-ui-redesign`  
**Working tree:** contains pre-existing and task-related uncommitted changes; no commit or merge was made.

## Repository structure and selected architecture

- The active application is the repository-root Next.js App Router project: `app/`, `components/`, `context/`, `hooks/`, `lib/`, `prisma/`, and `tests/`.
- Root API handlers are the active server surface. This follows the repository's pre-audit README, which described Next.js API routes as the backend. The Next rewrite that forwarded `/api/v1/*` to Express has been removed.
- `backend/src/` contains a separate legacy Express gateway and module routers. Its Prisma schema duplicates the root schema. The Express source is retained, but its standalone entrypoint is retired and the root application does not route traffic to it.
- `frontend/src/` and nested `Telle-Follow-up/` contain overlapping project copies. They are not used by the root app. Root TypeScript and lint checks target the root application; backend modules can still enter type checking when imported by tests.
- Root `prisma/schema.prisma` is the active schema and client source. Root Vitest tests are the active automated test suite. The root repository also contains older integration reports and diagnostic scripts; historical reports are not evidence of current behavior.

### Root routes found

The UI includes public home, login, signup and unavailable password-recovery pages; patient dashboard, recovery log, profile, documents and payments; clinician and coordinator dashboards; provider discovery and directory; risk triage; travel comparison and approvals; follow-up appointments; and teleconsultation.

The active API groups are auth, admin, clinician, coordinator, patient recovery logs, patient risk history, risk evaluation and review, providers and referrals, travel comparison and escalation, follow-up plans and appointments, teleconsultation sessions and records, payments, notifications, documents, cross-module aggregation, and OpenAPI.

The legacy Express app mounts auth, patients, risk, providers, travel, follow-up and payments under `/api/v1`. Its contracts and persistence are not the active root API contract.

## Five module boundaries and data flow

1. **Patient recovery:** the patient page submits recovery entries to the patient-scoped API. Entries and patient/surgery relationships are stored in PostgreSQL.
2. **Risk assessment:** evaluation reads persisted recovery data, stores the assessment and factors, and links an assessment to its recovery log. Clinician review is stored separately and is required for downstream routine planning.
3. **Provider discovery:** active queries use persisted facility and service records. Travel options require a verified facility with the requested service; emergency options additionally require emergency capability.
4. **Travel optimization:** the patient origin comes from the patient profile and city geocoding. A recent clinician-reviewed assessment is required. The API persists the comparison; route, time and cost remain estimates and do not book care or establish medical clearance.
5. **Follow-up and teleconsultation:** care plans, appointments, room records, consultation outcomes, notifications and optional payment orders use Prisma relations. Room creation alone does not complete an appointment.

The patient dashboard and risk/travel workflows use the shared cross-module and API routes rather than reading the legacy in-memory store. There are no `store`, `SAVED_COMPARISONS`, or seeded-fixture references in the active `app/api/` tree.

## Findings and disposition

### Critical

- **Client-supplied identity could be forged.** The shared root auth guard accepted `x-user-role` and `x-user-id`; an older payment history handler used those headers directly. The root guard now accepts only a signed bearer token or `teleflow_session` cookie, and protected APIs reload the current role and patient profile from PostgreSQL. Patient scope is based on the linked patient profile, not a client header or matching user ID. **Repaired in the active root API.**
- **Operational pages presented seeded identities and unsaved data as real.** Patient/risk/travel UI paths were connected to persisted APIs and hardcoded patient selectors/urgency simulations were removed. Fixture repositories remain for legacy unit tests and are not called by active root APIs. **Repaired in the active UI/API; legacy fixtures remain outside the operational path.**
- **Document handling lacked private file storage and authorization.** Uploads now validate PDF/PNG/JPEG signatures and size, store AES-GCM encrypted files outside public web assets, and serve them through patient-scoped authenticated routes. Metadata and audit events use Prisma. External OCR is optional and requires per-upload consent. **Implemented; storage-key and storage-volume configuration remains an operator requirement.**

### High

- **Two backend surfaces and schemas existed.** The baseline README specified root Next API routes, while an Express service and `backend/prisma/schema.prisma` also existed. The smallest consistent choice is to keep root Next routes canonical, remove the Express rewrite, and retire the Express server entrypoint. The legacy Express code and duplicate schema are still present and should not be treated as integrated or production-ready.
- **Business records used process-local stores.** Active root routes now query and write Prisma models and no longer fall back to `lib/server/store`. Some legacy service code and old Express route implementations still use fixtures or maps; these are outside the active route surface.
- **No root migration history existed.** The repository now has the initial schema migration and an additive clinician-application migration. Neither was applied to the configured database because its target and baseline ownership were not established. No reset or migration write was run.
- **Persistence could not be verified end to end.** A write/read-after-restart check against an isolated PostgreSQL test database was not run. Database-backed test cases are explicitly skipped rather than simulated.

### Medium

- **Authentication and account lifecycle.** Public registration creates patient accounts only and bcrypt hashes passwords. Admin routes assign staff roles. Password reset tokens and email delivery are not implemented; the UI now says recovery is unavailable instead of pretending to send a link.
- **External providers are configuration-dependent.** Razorpay, external OCR, optional Anthropic explanations, geocoding and the selected Jitsi domain are not health-checked by status labels. The UI and system status endpoint now distinguish configured/default behavior from verified provider connectivity. Email delivery is not implemented; notifications are in-app PostgreSQL records.
- **Map and travel estimates are approximate.** OpenStreetMap tiles and city-level geocoding/routing fallbacks do not guarantee current facility, traffic, transit, pricing, or appointment availability.
- **Documentation had stale identity headers and success claims.** The static OpenAPI auth schemes now describe the cookie/bearer session. Old phase reports remain historical; use the current integration report for verification status.

### Low

- Duplicate frontend copies and temporary diagnostic files remain in the working tree. They increase maintenance noise but are outside the root runtime.
- Lint reports one existing custom-font placement warning in `app/layout.tsx`; no lint errors remain in the configured root lint scope.

## Changes implemented

- Made the root Next App Router API the sole runtime API surface used by the web app; removed the `/api/v1` proxy rewrite and made `npm run server` use the same Next development server as `npm run dev`.
- Added a shared Prisma client, server-side role/resource helpers, signed HTTP-only sessions, role revalidation, patient-only registration, and an admin-only account bootstrap.
- Connected active recovery, risk/review, provider, travel, follow-up, appointment, teleconsultation, notification, payment, cross-module and document routes to Prisma.
- Added a root migration, safe environment setup, read-only schema validation helper, deployment migration commands, and updated README/OpenAPI setup guidance.
- Removed active API fallbacks to in-memory records and corrected UI/system-status claims for password recovery, teleconsultation and external integrations.
- Fixed duplicate patient navigation on payments/documents and replaced static profile/coordinator identities with saved data or missing-data states.
- Added clinician registration applications with administrator approval, plus a local-only demo seed for patient, clinician and administrator accounts and a synthetic follow-up/video appointment.

## Verification results

| Check | Result | Evidence |
|---|---|---|
| `npm test` | **PASS with skips** | 9 test files passed; 70 tests passed and 6 PostgreSQL-dependent tests skipped. Auth and clinician-registration contract tests use mocked Prisma; skipped tests cover saved-risk planning and persisted payment webhook outcomes. |
| `npx tsc --noEmit` | **PASS** | Root TypeScript check exited successfully. |
| `npm run lint` | **PASS with warning** | Zero errors; one Next custom-font placement warning in `app/layout.tsx`. |
| `npx prisma validate --schema prisma/schema.prisma` | **PASS** | Root Prisma schema validated. |
| `npm run db:deploy` | **PASS — dedicated local demo DB** | Both repository migrations were applied to `tele_follow_up_demo` on localhost:5433. The configured `.env` database was not migrated. |
| `npx prisma generate --schema prisma/schema.prisma` | **PASS** | Client generated into ignored `generated/prisma`, avoiding the DLL held by an existing development server. |
| `npm run build` | **FAIL** | Compilation and type validation completed, then prerender/page-data collection failed with missing generated artifacts (`build-manifest.json` on the default output; missing page output in an isolated build). Cause is not confirmed. |
| Local demo seed and API readback | **PASS** | Patient, clinician and admin logins succeeded; the patient API returned its seeded teleconsult appointment and a READY video room. No payment was captured. |
| Database restart persistence | **NOT RUN** | The seeded records were read through the live app, but PostgreSQL restart persistence was not separately checked. No write was attempted against the configured `.env` database. |
| Root active-API fixture scan | **PASS** | No `store`, seeded comparison, or seeded patient references found under `app/api/`. |

## Prioritized remaining work

1. Confirm the intended PostgreSQL database and migration baseline before applying migrations outside the dedicated local `tele_follow_up_demo` database.
2. Add an isolated PostgreSQL integration harness for account creation, recovery-to-risk persistence, risk-to-travel authorization, appointments, teleconsultation outcomes and payment webhooks.
3. Decide whether to remove the retired Express implementation and duplicate backend schema or separately migrate its remaining callers before ever re-enabling it.
4. Localhost reports Razorpay test checkout configured, but payment order/capture and webhook flows were not exercised. The public Jitsi domain needs no application credentials; test browser camera/microphone permissions.
