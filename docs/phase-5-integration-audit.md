# Tele-Follow-Up Orchestrator: Phase 5 Integration & Security Audit Report

> **Document Version:** 1.0.0  
> **Date:** October 18, 2026  
> **Branch Audited:** `feature/frontend-integration`  
> **Auditors:** Principal Integration Architect, Senior Full-Stack Engineer, Database Architect, Application Security Engineer  

---

## 1. Executive Summary

This audit evaluates the end-to-end integration across the five vertical modules of the **Tele-Follow-Up Orchestrator**, verifying the unified database schema, Express RBAC gateway, Next.js frontend authentication, cross-module data handoffs, and application security posture.

The audit identified critical security vulnerabilities (e.g. IDOR risks in patient endpoints, insecure role defaulting in legacy auth guards), architectural discrepancies between Next.js full-stack routes and the Express `/api/v1` gateway, and schema alignment issues between Prisma models.

---

## 2. Repository Structure Analysis

The repository was initially developed as a Next.js App Router full-stack monorepo with modules integrated via shared in-memory/Prisma data stores. During Phases 1–4, an Express backend (`backend/src/`) and unified Prisma schema (`backend/prisma/schema.prisma`) were created alongside mirrored frontend structures (`frontend/src/`).

| Directory / Layer | Current Role | Audit Assessment |
| :--- | :--- | :--- |
| `app/api/` | Next.js serverless API routes for M1–M5 | Working routes for cross-module integration, risk evaluation, and travel comparison. Legacy auth guards rely on unverified HTTP headers. |
| `backend/src/` | Express.js API gateway (`/api/v1/*`) | Contains JWT authentication, RBAC middleware, and module routers for all 5 slices. |
| `frontend/src/` & `context/`, `components/shared/` | Next.js client layers | `AuthContext`, `api-client`, `Sidebar`, and role-based views. |
| `prisma/schema.prisma` & `backend/prisma/` | Consolidated Prisma schema | Unified models for Auth, M1, M2, M3, M4, M5 with relational foreign keys. |
| `lib/` | Shared domain engines & services | Houses Deterministic Risk Rules, Claude CDS wrapper, Routing adapter, and Provider repository. |

---

## 3. Detailed Audit Findings by Severity

### CRITICAL SEVERITY

#### SEC-01: Header-Based Privilege Escalation in `lib/server/auth-guard.ts`
* **Location:** `lib/server/auth-guard.ts` (lines 15–28)
* **Vulnerability:** `getAuthContext()` directly reads `x-user-role` and `x-user-id` from raw request headers without cryptographic verification. Furthermore, if no role header is supplied, it **defaults to `'CLINICIAN'`**, granting administrative clinician privileges to unauthenticated callers.
* **Impact:** Any unauthenticated client or external caller can bypass RBAC and execute doctor overrides, access other patients' triage records, or approve care plans.
* **Remediation:** Refactor `getAuthContext()` to verify the cryptographic JWT from the `Authorization: Bearer <token>` header, strictly deriving `userId` and `role` from the verified token payload. If no valid token is present, fail closed (`isAuthorized: false`).

#### SEC-02: Insecure Direct Object Reference (IDOR) on Patient Telemetry Endpoints
* **Location:** `backend/src/modules/patients/patient.routes.ts` & `app/api/patients/`
* **Vulnerability:** Endpoints accepting `/:id/recovery-log` allow an authenticated user with role `PATIENT` to submit telemetry or retrieve data for arbitrary patient IDs without verifying that `req.user.userId === req.params.id`.
* **Impact:** Cross-patient medical record manipulation and privacy violation across state boundaries.
* **Remediation:** Inject server-side ownership enforcement middleware ensuring patients may only access their own records.

---

### HIGH SEVERITY

#### ARC-01: API Route Inconsistency between Next.js Client and Express Gateway
* **Location:** `next.config.ts`, `frontend/src/lib/api-client.ts`, `app/`
* **Issue:** Next.js pages make requests to `/api/v1/*` (intended for Express on `:5000`) and `/api/*` (handled by Next.js App Router on `:3000`). In production or local standalone runs without an explicit rewrite rule, requests to `/api/v1/*` fail with 404 in Next.js.
* **Remediation:** 
  1. Add an automated reverse-proxy rewrite in `next.config.ts` mapping `/api/v1/:path*` to `http://localhost:5000/api/v1/:path*` (or `process.env.BACKEND_URL`).
  2. Implement dual-support in Next.js route handlers (`app/api/v1/*`) or ensure clean fallback routing.

#### DB-01: Persistent PostgreSQL vs In-Memory Fallback State Management
* **Location:** `lib/risk/store.ts`, `lib/travel/data-store.ts`, `lib/server/store.ts`
* **Issue:** While Prisma schemas define PostgreSQL tables, several modules rely on in-memory Maps (`Map<string, ...>`). If the application restarts, non-persisted assessments and referrals are lost.
* **Remediation:** Ensure Prisma client queries are prioritized with thread-safe atomic writes, wrapping in-memory structures strictly as secondary fallback caches.

---

### MEDIUM SEVERITY

#### INT-01: Risk Engine Idempotency on Repeated Telemetry Submissions
* **Location:** `backend/src/modules/patients/patient.routes.ts` (Phase 4 handoff)
* **Issue:** Retrying recovery telemetry submissions generates duplicate `RiskAssessment` records for the same post-op day without hashing the telemetry payload or verifying existing evaluations.
* **Remediation:** Compute `inputDataHash` (SHA-256) of vitals and symptoms; if an identical assessment already exists for the patient and log ID, return the existing assessment rather than creating redundant records.

#### SEC-03: JWT Storage in Browser `localStorage`
* **Location:** `frontend/src/context/AuthContext.tsx`, `frontend/src/lib/api-client.ts`
* **Issue:** Tokens stored in `localStorage` are vulnerable to Cross-Site Scripting (XSS).
* **Remediation:** While acceptable for the current decoupled prototype architecture, document the transition path to `httpOnly`, `SameSite=Strict` secure cookies for clinical production deployments.

---

### LOW SEVERITY

#### CFG-01: Package Dependency Resolution Conflict
* **Location:** `package.json`
* **Issue:** Peer dependency mismatch between `@types/node` and `vitest` requires `--legacy-peer-deps` during clean installs.
* **Remediation:** Align version pins in `package.json` for seamless `npm install` across environments.

---

## 4. Phase 5 Action & Remediation Plan

1. **Fix SEC-01 & SEC-02:** Harden `lib/server/auth-guard.ts` with real JWT verification; enforce server-side patient IDOR ownership checks in `backend/src/modules/patients/` and `app/api/`.
2. **Fix ARC-01:** Configure proxy rewrites in `next.config.ts` so frontend client calls to `/api/v1/*` seamlessly route to Express.
3. **Validate Database:** Run `npx prisma validate` and verify client generation without schema regressions.
4. **Harden Module 1 $\to$ Module 2 Handoff:** Inject payload hashing and deduplication in the Recovery-to-Risk evaluation pipeline.
5. **Execute Security & Integration Tests:** Run security tests verifying that unauthorized callers, IDOR attempts, and missing JWTs are strictly blocked with 401/403.
