# Tele-Follow-Up Orchestrator: Member 1 Deployment & Operations Manual
**Module:** Patient Registration, Surgery/Discharge, Recovery Observations, and Medical Documents with OCR Verification  
**Repository:** `Saturn-space/Telle-Follow-up`  
**Target Release Branch:** `feature/member-1-phase-4-release`  

---

## 1. System Architecture Overview

The Member 1 slice of the Tele-Follow-Up Orchestrator provides post-surgical patient profiling, surgery/discharge tracking, recovery check-in logging (NRS 0–10 pain, mobility, wound appearance, and physiological vitals), longitudinal recovery timelines, diagnostic document ingestion with magic-byte validation, and side-by-side human-in-the-loop OCR verification.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS 15 APP ROUTER                           │
│  - / (Interactive Dashboard with Role Switcher & Case Selector)        │
│  - /api/v1/health (Release Diagnostics)                                │
│  - /api/v1/openapi (OpenAPI 3.0 Documentation)                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST (JSON)
┌───────────────────────────────────▼────────────────────────────────────┐
│                    API GATEWAY & SECURITY LAYER                        │
│  - AuthGuard: Enforces RBAC (PATIENT, CLINICIAN, COORDINATOR, ADMIN)   │
│  - IDOR Protection: Blocks cross-patient record access                 │
│  - Input Sanitization & Hemodynamic Validation                         │
│  - Anti-Spoofing: Binary magic bytes validation for PDF/PNG/JPEG       │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
     Prisma Client │                                 │ HTTP / JSON
┌──────────────────▼───────────────┐   ┌─────────────▼───────────────────┐
│     POSTGRESQL (PRISMA ORM)      │   │   OPTIONAL FASTAPI OCR SERVICE  │
│  - schema.prisma                 │   │   (Tesseract / PaddleOCR)       │
│  - In-Memory Relational Fallback │   │   Fallback: Integrated Dual-Mode│
└──────────────────────────────────┘   └─────────────────────────────────┘
```

---

## 2. Prerequisites & Environment Setup

### Minimum Server Requirements
* **Runtime:** Node.js 20.x or higher, npm 10.x+
* **Database:** PostgreSQL 14+ (or connection to Cloud SQL / Neon / Supabase)
* **Memory:** 1 GB RAM minimum (2 GB recommended for PDF buffer processing)

### Environment Configuration
Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable Name | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `PORT` | No | `3000` | Port for the Next.js server. |
| `DATABASE_URL` | Production | `postgresql://user:pass@localhost:5432/tele_follow_up?schema=public` | Shared PostgreSQL connection string for Prisma ORM. |
| `APP_URL` | Yes | `http://localhost:3000` | Base URL used for API routes and self-referential links. |
| `OCR_SERVICE_URL` | No | `http://localhost:8000` | Optional external FastAPI Python microservice running Tesseract or PaddleOCR. |

---

## 3. Database Migration Instructions

1. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```
2. **Apply Migrations to Target PostgreSQL Database:**
   ```bash
   # Development environment
   npx prisma db push

   # Production staging / release
   npx prisma migrate deploy
   ```
3. *Note on Development Environment:* When `DATABASE_URL` is omitted, the application uses its built-in relational clinical store (`lib/db/store.ts`), pre-seeded with 3 synthetic post-op cases for immediate testing without external database dependencies.

---

## 4. Build & Production Start Commands

```bash
# 1. Install dependencies
npm install

# 2. Run automated validation test suite
npm test

# 3. Compile optimized production build
npm run build

# 4. Start production server
npm start
```

---

## 5. Medical Document Storage Configuration

* **Development & Staging:** Uploaded documents are saved under `/uploads/documents/[patientId]/[timestamp]_[randomHash].[ext]`.
* **Path Traversal Defense:** Filenames are strictly sanitized to strip all directory separators (`/`, `\`) and parent directory sequences (`..`).
* **Magic Bytes Verification:** Binary headers are checked before saving:
  * PDF: `%PDF-` signature
  * PNG: `0x89504E47` signature
  * JPEG: `0xFFD8FF` signature
* **Production Recommendation:** For production Kubernetes/Cloud Run environments, configure an S3 / Google Cloud Storage signed URL adapter so files do not reside on container ephemeral disks.

---

## 6. OCR Engine Deployment Modes

The Member 1 module implements a **dual-mode OCR architecture**:
1. **Integrated Dual-Mode Extractor (Active Default):** Runs directly inside Node.js. Parses clinical entities (procedure, medications, staple counts, WBC, hemoglobin) from discharge summaries and lab diagnostics.
2. **External FastAPI Service:** When `OCR_SERVICE_URL` is set, requests are dispatched via HTTP multipart to the Python FastAPI microservice running native Tesseract OCR or PaddleOCR.
3. **Clinical Safety Invariant:** Regardless of OCR engine, all extracted output starts in `isVerified: false`. Extracted medical text is never promoted to the verified medical record without explicit clinician review.

---

## 7. Diagnostics & Health Verification

Verify deployment health by querying:

```bash
curl -s http://localhost:3000/api/v1/health
```

Expected Response:
```json
{
  "status": "HEALTHY",
  "version": "1.0.0",
  "module": "Member 1: Patient Profile & Recovery Management",
  "system": {
    "framework": "Next.js 15.5 (App Router)",
    "database": {
      "configuredOrm": "Prisma (PostgreSQL)",
      "runtimeStore": "In-Memory Relational Store (Active)",
      "totalSeededPatients": 3
    },
    "security": {
      "rbac": "Enforced (PATIENT, CLINICIAN, COORDINATOR, ADMIN)",
      "idorIsolation": "Active",
      "magicBytesInspection": "Active"
    }
  }
}
```

---

## 8. Cross-Member Integration Contracts

* **Member 2 (AI Risk Assessment):** `GET /api/v1/patients/[id]/member2-contract`
  * Emits observation freshness (`CURRENT` vs `STALE`), hours since last observation, explicit units, and surgical context.
  * Guarantee: Zero fabricated risk scores or false claims of clinical normalcy.
* **Member 3 (Healthcare Directory):** Patient home location (`homeCity`, `homeState`, `homeZip`) and surgical specialty for nearby provider matching.
* **Member 4 (Travel Optimization):** Distance disparity between operating hospital (`hospitalCity`, `hospitalState`) and patient residence (`homeCity`, `homeState`).
* **Member 5 (Follow-Up & Teleconsultation):** Stable `Patient.id`, `Surgery.id`, and `plannedFollowUpDate` for appointment scheduling.
