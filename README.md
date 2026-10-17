# Tele-Follow-Up Orchestrator
> **An AI-Assisted Post-Surgical Follow-Up Coordination System**  
> GitHub Repository: `Saturn-space/Telle-Follow-up`  
> Feature Branch: `feature/member-5-phase-4-release`

---

## 1. Project Purpose & Overview

Patients frequently travel long distances or across state lines to specialized tertiary hospitals for complex surgical procedures (e.g., CABG, joint arthroplasty, oncologic resections). After discharge, routine post-operative checks typically require repeated long-distance return trips. This causes heavy financial burdens, transit fatigue during vulnerable recovery phases, and logistical strain.

The **Tele-Follow-Up Orchestrator** is an integrated coordination platform that:
1. Ingests daily patient recovery symptoms, vitals, and verified OCR diagnostic summaries.
2. Performs AI-assisted risk stratification to detect healing complications early.
3. Discovers nearby verified healthcare facilities for routine wound dressings, suture removals, and blood draws.
4. Computes transparent travel-versus-local trade-offs without compromising clinical necessity.
5. Orchestrates doctor-approved follow-up care plans, local clinic visits, and secure teleconsultations.

> **Academic Prototype Notice:** This system is an academic clinical decision support (CDS) prototype, not an autonomous medical device. All AI assessments and follow-up plans require authorized clinician review and sign-off.

---

## 2. Five-Member Vertical Slice Architecture

| Team Member | Module Ownership | Core Deliverables |
| :--- | :--- | :--- |
| **Member 1** | **Patient Registration & Recovery Monitoring** | Demographics, discharge orders, daily recovery telemetry, document OCR review UI, recovery timeline. |
| **Member 2** | **AI Risk Prediction & Decision Support** | Longitudinal risk stratification, clinical red-flag detection, explanation rationale, doctor overrides. |
| **Member 3** | **Local Healthcare Discovery & Directory** | Geospatial clinic search, capability filters (sutures, labs), verified provider registry. |
| **Member 4** | **Travel Optimization & Escalation** | Transit route calculation, cost/time trade-off matrices, emergency escalation protocol. |
| **Member 5** | **Follow-Up, Teleconsultation & Platform Integration** | Follow-up care plans, appointment lifecycle, Jitsi video consultation, optional payments, end-to-end orchestration. |

---

## 3. Technology Stack

* **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Motion.
* **Backend:** Next.js App Router API Routes & Node.js services (`/api/followup/*`, `/api/teleconsult/*`, `/api/payments/*`, `/api/notifications`, `/api/integration/*`).
* **Database & ORM:** PostgreSQL with Prisma ORM (`prisma/schema.prisma`).
* **Teleconsultation:** Jitsi Meet External IFrame API with zero-PII room generation.
* **Payments:** Official Razorpay Node.js SDK (Optional, disabled by default via `PAYMENTS_ENABLED="false"`).
* **Testing:** Vitest, Node crypto testing suites.
* **API Documentation:** OpenAPI 3.0 (`docs/openapi.json`).

---

## 4. Key Architectural & Safety Invariants

1. **Absolute Clinical Safety Escalation:**
   If a patient exhibits acute surgical red flags (e.g., fever > 38.5°C, acute guarding, purulent discharge), routine travel optimization and remote appointment booking are **strictly suppressed**. The system returns `409 Conflict` (`CLINICAL_ESCALATION_OVERRIDE`) and routes the patient directly to emergency hospital evaluation.
2. **Missing Risk Data Protection:**
   Missing or stale risk data is **never** silently treated as safe. The system flags `RISK_DATA_UNAVAILABLE` and mandates explicit clinician review before any follow-up plan can be created.
3. **Zero-PII Teleconsultation URLs:**
   Jitsi rooms are generated using 128-bit cryptographically random hex strings (e.g., `tfo-sess-a94f83b172ec412e9d214f183c2a0011`). Patient names, MRNs, surgical procedures, and diagnoses are strictly excluded from room names and URL parameters.
4. **Consultation Completion Integrity:**
   Generating a meeting room or launching a call never marks a consultation complete. An appointment is only transitioned to `COMPLETED` when the attending doctor records and signs a `ConsultationRecord`.
5. **Care Never Gated by Payment:**
   Payment is optional and disabled by default. Payment failure or absence never gates urgent care, emergency escalation, or follow-up eligibility.
6. **Timing-Safe Cryptographic Signature Verification:**
   All Razorpay payment verifications use `crypto.timingSafeEqual` over backend HMAC-SHA256 calculations to prevent timing attacks.

---

## 5. Local Setup & Installation

### Prerequisites
* Node.js 20+
* PostgreSQL instance (or use the included in-memory data store for local dev testing)

### Installation Steps
```bash
# Clone repository
git clone https://github.com/Saturn-space/Telle-Follow-up.git
cd Telle-Follow-up

# Switch to Member 5 release branch
git checkout feature/member-5-phase-4-release

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Run automated test suites (24 tests)
npm test

# Run linter
npm run lint

# Start development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Environment Variables Reference (`.env.example`)

```bash
# Base Application URL
APP_URL="http://localhost:3000"

# PostgreSQL Database (Shared Prisma)
DATABASE_URL="postgresql://user:password@localhost:5432/tele_followup_db?schema=public"

# Shared JWT Secret
JWT_SECRET="development-jwt-secret-do-not-use-in-production"

# Jitsi Meet Domain (Defaults to public meet.jit.si or self-hosted instance)
JITSI_DOMAIN="meet.jit.si"

# Optional Razorpay Gateway (Disabled by default)
PAYMENTS_ENABLED="false"
RAZORPAY_KEY_ID="rzp_test_placeholder"
RAZORPAY_KEY_SECRET="placeholder_secret"
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_placeholder"
```

---

## 7. Database Migrations (PostgreSQL + Prisma)

To run migrations against a live PostgreSQL database:
```bash
# Generate Prisma Client
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name init_tele_followup_orchestrator

# Deploy in production
npx prisma migrate deploy
```

---

## 8. Synthetic Demonstration Scenarios

The orchestration hub provides 3 built-in synthetic test scenarios:

### Scenario 1: Stable Post-CABG Patient (Rajesh Sharma, `pat-101`)
* **Background:** 58M, Post-Coronary Artery Bypass Graft (3 vessels) at Apollo Chennai. Home: Bhubaneswar, Odisha (1,250 km away).
* **Workflow:** Daily vitals stable $\to$ Member 2 assigns `LOW` risk tier (0.18) $\to$ Member 3 attaches local verified diagnostic lab $\to$ Member 4 calculates ₹16,500 and 28.5 hours saved $\to$ Member 5 schedules local resting ECG + encrypted video consultation with Dr. Ramanathan.

### Scenario 2: Post-TKA Joint Patient (Anita Roy, `pat-102`)
* **Background:** 64F, Total Knee Arthroplasty at Fortis Bengaluru. Home: Ranchi, Jharkhand (1,480 km away).
* **Workflow:** Mild expected post-op swelling $\to$ Member 2 assigns `MEDIUM` risk tier (0.42) $\to$ Suture removal due on Post-Op Day 14 $\to$ Member 5 coordinates in-person staple removal at local verified orthopedic clinic (5.2 km away) followed by remote surgeon sign-off.

### Scenario 3: Emergency Surgical Escalation (Sunita Devi, `pat-103`)
* **Background:** 45F, Laparoscopic Cholecystectomy at AIIMS New Delhi. Home: Patna, Bihar.
* **Workflow:** High-grade fever (39.1°C), bile leak suspicion, acute peritoneal guarding $\to$ Member 2 flags `HIGH` risk tier (0.89) $\to$ **Emergency Safety Escalation** triggers $\to$ Suppresses travel optimization $\to$ Blocks routine remote follow-up scheduling (`409 Conflict`) $\to$ Directs patient to urgent tertiary hospital emergency department.

---

## 9. Automated Testing Baseline

Automated test suites executed via Vitest:
```bash
npm test
```
* `tests/followup-service.test.ts` (14 tests): Unit testing plan creation, appointment lifecycle, duplicate scheduling collisions, zero-PII teleconsultations, and HMAC signature validation.
* `tests/api-security-and-hardening.test.ts` (7 tests): API security testing role authorization headers (`x-user-role`), cross-patient isolation, 403 Forbidden constraints, and 409 Conflict escalation overrides.
* `tests/e2e-workflow.test.ts` (3 tests): Full end-to-end integration across all 5 member stages and emergency safety invariant enforcement.

**Total:** 24 passing tests, 0 failures, 0 skipped.

---

## 10. API Specification

See complete OpenAPI 3.0 specification in [`docs/openapi.json`](docs/openapi.json).
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/c752834b-f101-41e8-b3c0-c6518cf62c51
View your app in AI Studio: https://ai.studio/apps/88bdf4d2-3705-4ab1-9047-d156d58213d8
View your app in AI Studio: https://ai.studio/apps/a8aabaea-265c-4d3d-95a5-f1699f2dad33

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
