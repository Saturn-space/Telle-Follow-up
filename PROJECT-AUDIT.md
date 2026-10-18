# TELE-FOLLOW-UP ORCHESTRATOR — ARCHITECTURE & SECURITY AUDIT
**Date:** October 18, 2026 | **Author:** Principal Software Architect & Full-Stack Engineer

---

## 1. Actual Starting Architecture

The repository contains a hybrid architecture combining:
1. **Frontend**: Next.js 15 (App Router, React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Material Symbols).
2. **Backend**: Dual-mode capability:
   - Next.js Serverless API routes under pp/api/*
   - Express.js standalone service in ackend/src/server.ts mounting route modules for auth, patients, risk, providers, travel, followup, and payments.
3. **Database**: PostgreSQL with Prisma ORM 5.22.0. Database connection string points to remote PostgreSQL pool.
4. **Design System**: "Corporate Modern with Luminous Depth" integrating Geist fonts, #F6F8FF canvas, #1745D8 primary, #0D9488 teal recovery, #B91C1C clinical alerts, and glassmorphic cards.
5. **Key Modules**:
   - Module 1: Patient Registration, Surgery Record, Daily Recovery Telemetry
   - Module 2: AI Risk Stratification (Claude CDS hybrid + Deterministic Clinical Rules)
   - Module 3: Verified Healthcare Provider Directory & Leaflet Geolocation Map
   - Module 4: Travel vs Local Care Cost/Distance Optimization & Clinical Escalation
   - Module 5: Follow-Up Plans, Appointments, Jitsi Teleconsultation, and Razorpay Payments (INR)

---

## 2. Identified Defects & Gaps

1. **Missing Authentication-First Entry & Redirects**:
   - Root / renders a public landing page or mixed dashboard rather than redirecting unauthenticated users to /login.
   - /login, /signup, /forgot-password pages were not fully wired to real PostgreSQL authentication with session cookies/Bearer tokens.
2. **Prisma Role Enum Discrepancy**:
   - prisma/schema.prisma contained enum Role { PATIENT, CLINICIAN, COORDINATOR }, omitting the required ADMIN role.
3. **Missing Medical Document Model & Secure Uploads**:
   - Schema lacked a dedicated MedicalDocument model with ownership, MIME validation, storage path, OCR parsing results, and clinical verification flags.
4. **Audit Logging & Initial Admin Provisioning**:
   - No AuditLog table for tracking administrative actions, role assignments, or sensitive record accesses.
5. **Database State**:
   - Remote PostgreSQL pool was empty (P4001 The introspected database was empty). Schema had not yet been pushed to the database.
6. **API Verification Findings**:
   - **Razorpay**: Valid test keys verified with HTTP 200 order generation in INR (paise).
   - **MapTiler (Maps)**: Valid key verified with HTTP 200 tile/style responses.
   - **Anthropic Claude**: Key returned HTTP 401 (invalid x-api-key). Robust fallback to deterministic clinical rules active.
   - **Brevo Email**: Key returned HTTP 401. Email delivery will use verified fallback with transparent simulated/local status.
   - **Jitsi Meet**: 8x8 JaaS vpaas key and private RSA key configured for secure JWT teleconsultation rooms.
   - **OCR Service**: https://api.ocr.space/parse/image endpoint configured with fallback parsing.

---

## 3. Reusable Functionality

- lib/server/auth-guard.ts: Robust JWT parsing and RBAC verification.
- lib/server/followup-service.ts: Appointment lifecycle, collision detection, and zero-PII teleconsultation rooms.
- lib/risk/claude.ts & lib/risk/rules.ts: Deterministic physiological triage rules and structured CDS synthesis.
- lib/travel/comparison-service.ts & lib/travel/routing-adapter.ts: Haversine & OSRM routing, travel cost computations in INR.
- lib/db/provider-repository.ts: 15+ verified healthcare centers across Indian metropolitan regions.
- UI components: Responsive cards, luminous depth, status badges, and tab navigation.

---

## 4. Integration Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Inactive external AI API key (401) | Unhandled crash or blank CDS output | Transparent fallback to deterministic rule engine; flag iStatus: 'UNAVAILABLE_FALLBACK_RULES' |
| Inactive Email API key (401) | Notification delivery failure | Persist notifications in DB; mark delivery status truthfully as SIMULATED_LOCAL |
| In-memory store desynchronization | Lost patient records on restart | Push Prisma schema to remote PostgreSQL and synchronize all CRUD operations |
| Direct Object Reference (IDOR) | Cross-patient record tampering | Enforce ownership check checkPatientAccess(ctx, patientId) in all patient endpoints |
| Payment tampering | Client-side fake success | Server-side signature verification with HMAC-SHA256; update records only on verified signature |

---

## 5. Implementation Plan

1. **Step 1: Database & Schema Consolidation**:
   - Update prisma/schema.prisma to include ADMIN role, MedicalDocument, and AuditLog models.
   - Execute 
px prisma db push to generate all tables in remote PostgreSQL.
   - Execute database seed script with sample patients, clinicians, coordinators, and administrators with securely hashed passwords.
2. **Step 2: Environment Configuration & Secret Management**:
   - Update .env with all configured keys.
   - Produce comprehensive .env.example with non-secret placeholders.
3. **Step 3: Authentication & RBAC Engine**:
   - Create Next.js API routes /api/auth/login, /api/auth/register, /api/auth/me, /api/auth/logout.
   - Implement HTTP-only cookie + Bearer token support.
   - Implement client AuthContext with role hydration.
   - Implement /login, /signup, /forgot-password pages.
   - Setup route guards redirecting / to /login when unauthenticated, and redirecting logged-in users to their role-specific dashboard.
4. **Step 4: Role-Specific Dashboards & Workflows**:
   - Patient Dashboard: Profile, surgery details, daily recovery tracking, medical documents + OCR, AI risk CDS, provider map, follow-up appointments, Jitsi teleconsultation, and Razorpay INR payment history.
   - Clinician Dashboard: Assigned patient queue, clinical reviews, risk escalation, triage overrides.
   - Coordinator Dashboard: Schedule coordination, referral dispatch, provider management.
   - Admin Dashboard: User management, role elevation controls, audit log viewer, system configuration status.
5. **Step 5: External API Adapters**:
   - MapTiler / OpenStreetMap Leaflet integration.
   - Razorpay INR order creation, signature verification, and webhook handling.
   - Jitsi Meet JWT generator with 8x8 vpaas RSA keys.
   - OCR document processor with OCR.Space API and fallback text extraction.
   - Anthropic Claude CDS with deterministic fallback.
   - Notification service with Brevo adapter and in-app DB persistence.
6. **Step 6: Automated Testing & Verification**:
   - Unit tests, RBAC security tests, payment verification tests, and end-to-end integration tests.
   - Ensure 
pm test and build scripts pass cleanly.
