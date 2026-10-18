# Tele-Follow-Up

Tele-Follow-Up is a Next.js application for post-discharge recovery logs, clinician risk review, verified facility search, travel estimates, care plans, appointments, teleconsultation records, and optional payments.

Clinical assessments and route estimates support care coordination. They do not replace a clinician's judgment, emergency services, or confirmation from a facility.

## Active application

The repository root is the active application. It uses the Next.js App Router for both pages and `/api/*` endpoints, PostgreSQL through Prisma, and the root `prisma/schema.prisma` as its schema source. The old Express entry point is retired; `npm run server` now starts the same Next.js development server as `npm run dev`.

The old `backend/`, `frontend/src/`, and nested `Telle-Follow-up/` trees are retained as legacy copies and are excluded from the root TypeScript build. Do not use their Prisma schemas or API routes for new work.

## Requirements

- Node.js 20 or later
- PostgreSQL 14 or later
- npm

## Local setup

1. Install packages and create a local environment file:

   ```powershell
   npm ci
   npm run setup:env
   ```

   `setup:env` copies placeholders from `.env.example` and leaves an existing `.env` untouched.

2. Set `DATABASE_URL`, a random `JWT_SECRET` with at least 32 characters, and `DOCUMENT_STORAGE_KEY` in `.env`. Generate a 32-byte document key with:

   ```powershell
   node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64'))"
   ```

   Keep the document key backed up securely. Existing encrypted uploads cannot be read if this key is lost or changed. The default document directory is `.private-data/documents`, outside the public web directory; set `DOCUMENT_STORAGE_PATH` to a persistent private volume in deployments.

3. Generate the Prisma client and apply migrations to a **fresh local development database**:

   ```powershell
   npm run db:generate
   npm run db:deploy
   ```

   The repository includes the initial schema migration and a clinician-registration migration. Existing databases may already contain tables without Prisma migration history. Back up and compare such a database before baselining or applying migrations; do not reset it.
   The generated client is written to ignored `generated/prisma` so regeneration does not replace the package client DLL used by another running Windows development server.

4. Start the application:

   ```powershell
   npm run dev
   ```

   Open [http://localhost:8000](http://localhost:8000).

For an isolated demo database on port 5433, use the checked-in Compose service and keep the database URL scoped to this PowerShell session:

```powershell
npm run db:demo:start
$env:DATABASE_URL='postgresql://teleflow_demo:LocalDemoDb2026!@localhost:5433/tele_follow_up_demo?schema=public'
$env:DEMO_MODE='true'
npm run db:deploy
npm run seed:demo
npm run dev
```

`npm run db:demo:stop` stops PostgreSQL and keeps its local volume for the next run. The demo seed refuses production, non-local hosts, and any database other than `tele_follow_up_demo`.

Patient self-registration creates patient accounts only. Doctors can submit a separate clinician application; they cannot sign in until an administrator reviews the license details and approves it. The application form does not verify licenses against an external registry.

To provision the first administrator, set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in the process environment, then run `npm run seed:admin`. The admin seed creates no sample clinical records. Use the administrator console to assign staff roles.

### Local demo accounts

The demo seed is restricted to a non-production process with `DEMO_MODE=true` and a dedicated database named `tele_follow_up_demo` hosted on `localhost`, `127.0.0.1`, or `::1`. Apply migrations first, then run `npm run seed:demo`. It creates synthetic local records for a patient, clinician, administrator, pending clinician application, sample facility, reviewed assessment, billable follow-up appointment, and video session. The sample facility is marked as a demo record and cannot be used for referrals or travel recommendations. The seed does not create fake payment captures.

| Role | Email | Password | Demo use |
|---|---|---|---|
| Patient | `demo.patient@teleflow.local` | `LocalDemoPatient!2026` | Billing and patient side of the scheduled video consultation |
| Doctor | `demo.doctor@teleflow.local` | `LocalDemoDoctor!2026` | Clinician dashboard and clinician side of the video consultation |
| Administrator | `demo.admin@teleflow.local` | `LocalDemoAdmin!2026` | Review pending doctor registrations and administer the demo |

The seeded pending doctor application is `demo.applicant@teleflow.local` with password `LocalDemoApplicant!2026`; it cannot sign in until approved. The application uses a clearly synthetic license number so the administrator can demonstrate hold, resume, and approval.

These credentials are for local software testing only. They exist in the dedicated local demo database, not in any other configured database. The sign-in page has fill-account buttons in development; run `npm run seed:demo` first if the local demo database is empty.

## Environment configuration

Required values:

- `DATABASE_URL`: PostgreSQL connection string.
- `JWT_SECRET`: signing key, at least 32 characters.
- `DOCUMENT_STORAGE_KEY`: base64 encoded 32-byte AES-GCM key.

Optional integrations are off until configured:

- `ANTHROPIC_API_KEY` enables risk explanation text; deterministic rules remain available without it.
- `OCR_SERVICE_URL` and `OCR_API_KEY` enable the OCR.Space-compatible adapter. A user must consent on each upload before the document is sent to that external service. Without consent, the file is stored encrypted and OCR remains `NOT_REQUIRED`.
- `PAYMENTS_ENABLED`, Razorpay credentials, and webhook secret enable payments. Payment does not gate care.
- `NEXT_PUBLIC_DEMO_MODE=true` shows clearly labeled synthetic directory examples in local development. These entries are not real care providers.
- `GEOCODING_SERVICE_URL` selects a Nominatim-compatible geocoder. Travel comparisons use city-level locations and clearly label approximate estimates.
- `JITSI_DOMAIN` selects the external meeting domain. The public Jitsi domain does not require application credentials; configure a domain you control for production use.

For billing, sign in with the patient demo account and open **Billing & Payments**. Checkout uses Razorpay test mode from local environment settings; never put provider secrets in the demo account table or source control. The seeded patient has an eligible appointment, but the seed does not mark anything paid. The current localhost app reports test checkout as configured. Video consulting uses the seeded appointment: sign in as the patient or assigned doctor and open the scheduled session. Jitsi requires no separate app username or password; allow camera and microphone access in the browser.

See `.env.example` for the complete variable list. Never commit `.env`, encryption keys, or service credentials.

## Database commands

```powershell
npm run db:validate  # validate the root Prisma schema
npm run db:generate  # generate Prisma Client
npm run db:status    # inspect migration state
npm run db:migrate   # create/apply a development migration
npm run db:deploy    # apply committed migrations
```

No reset or destructive database command is part of the setup workflow.

## Verification commands

```powershell
npm test
npx tsc --noEmit
npm run lint
npm run db:validate
```

The OpenAPI documents are served at `/api/docs/openapi` and `/api/risk-assessments/openapi`.

## Data and access rules

- Sessions use a signed HTTP-only cookie. Client-supplied role, user, and patient headers are not trusted.
- Patient records, risk assessments, travel comparisons, providers, care plans, appointments, teleconsultation records, payment orders, documents, and notifications use PostgreSQL.
- A travel comparison requires a recent clinician-reviewed risk assessment and verified, service-matched facility records. Route, time, and cost outputs are estimates, not booking confirmation or travel clearance.
- Provider verification is an administrator-recorded decision with evidence and a license number. New community entries remain unverified until reviewed.
- Uploaded PDF, PNG, and JPEG documents are encrypted at rest with AES-256-GCM and served only through an authenticated, patient-scoped route. OCR text is marked unverified.
- Jitsi rooms use random non-identifying names. A consultation is completed only after a clinician saves a consultation record.
- The initial admin seed does not create clinical demo data. Only add real provider or patient data through an authorized workflow.
