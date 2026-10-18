# API INTEGRATION REGISTER — TELE-FOLLOW-UP ORCHESTRATOR
**Confidentiality Notice:** No secret keys or private tokens are disclosed in this document.

| Field | Required information |
|---|---|
| Provider | Actual API provider name |
| Purpose | Feature supported by the service |
| Environment variables | Required variable names only |
| Server/client | Where requests are permitted |
| Integration status | Implemented, verified, blocked, or disabled |
| Test method | How the integration will be validated |
| Limitations | Missing credentials, configuration, or unavailable service |

---

## Detailed Service Catalog

### 1. PostgreSQL Database (Prisma ORM)
- **Provider**: PostgreSQL (Neon / Prisma Data Platform Pool)
- **Purpose**: Canonical relational storage for accounts, patients, surgeries, recovery logs, risk assessments, healthcare facilities, follow-up plans, appointments, teleconsultations, medical documents, audit events, and payments.
- **Environment variables**: DATABASE_URL
- **Server/client**: Server-side only
- **Integration status**: Verified (Connection and handshake confirmed via Prisma)
- **Test method**: 
px prisma db push, 
px prisma generate, synthetic data seeding script.
- **Limitations**: None; database pool is reachable and responsive over SSL.

### 2. Razorpay Payment Gateway (INR Only)
- **Provider**: Razorpay India
- **Purpose**: Creation of INR orders for teleconsultations and local clinic referrals, client checkout initialization, HMAC-SHA256 signature verification, and webhook handling.
- **Environment variables**: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, NEXT_PUBLIC_RAZORPAY_KEY_ID, PAYMENTS_ENABLED
- **Server/client**: Server (order creation & verification) & Client (Razorpay Checkout modal with public key only)
- **Integration status**: Verified (HTTP 200 order generation in test mode confirmed)
- **Test method**: Automated order creation test script, HMAC-SHA256 signature verification test suite.
- **Limitations**: Test-mode keys active; no real financial transactions conducted. Currency strictly restricted to INR.

### 3. MapTiler & OpenStreetMap Leaflet
- **Provider**: MapTiler Cloud / OpenStreetMap Foundation
- **Purpose**: High-resolution vector/raster map rendering, healthcare facility pins, radius searches, distance measurements, and patient travel route visualizations.
- **Environment variables**: MAPS_API_KEY, NEXT_PUBLIC_MAPS_API_KEY
- **Server/client**: Client-side Leaflet tiles & server-side routing estimates
- **Integration status**: Verified (HTTP 200 vector/raster tile styling confirmed)
- **Test method**: Tile load check, Leaflet container mounting test, Haversine/OSRM route distance validator.
- **Limitations**: Requires client internet connectivity for remote tile downloads; fallback to OpenStreetMap default tiles provided.

### 4. Anthropic Claude Clinical Decision Support (CDS)
- **Provider**: Anthropic (Claude 3.5 Sonnet)
- **Purpose**: Clinical synthesis, patient-friendly summary generation, and doctor question formulating based on recovery observations and vitals.
- **Environment variables**: ANTHROPIC_API_KEY, ANTHROPIC_MODEL
- **Server/client**: Server-side only
- **Integration status**: Implemented with Deterministic Fallback (Supplied key returned HTTP 401 invalid x-api-key)
- **Test method**: Automated unit test with simulated response and fallback to physiological deterministic rules.
- **Limitations**: Because the external key returned 401, the system safely falls back to the deterministic rule engine and flags iStatus: 'UNAVAILABLE_FALLBACK_RULES'. Truthful state displayed to user without fabrication.

### 5. Jitsi Meet / 8x8 JaaS Teleconsultation
- **Provider**: 8x8 JaaS (Jitsi as a Service) & Public Jitsi Meet
- **Purpose**: Browser-based encrypted video teleconsultations for doctors and patients with zero-PII room generation.
- **Environment variables**: JITSI_DOMAIN, JITSI_APP_ID, JITSI_PRIVATE_KEY
- **Server/client**: Server (RS256 JWT generation with private key) & Client (Jitsi Meet iframe API)
- **Integration status**: Implemented & Configured
- **Test method**: RS256 JWT signature test, room name entropy validation (zero PII in URL), status lifecycle tests.
- **Limitations**: Requires camera and microphone permissions in browser.

### 6. OCR Document Processing (OCR.Space)
- **Provider**: OCR.Space / Server-side Document Parser
- **Purpose**: Text extraction from uploaded discharge summaries, surgical notes, and lab reports.
- **Environment variables**: OCR_SERVICE_URL, OCR_API_KEY
- **Server/client**: Server-side only
- **Integration status**: Implemented with Fallback Extraction
- **Test method**: Synthetic discharge summary upload, text extraction test, unverified-state display test.
- **Limitations**: Output flagged as "UNVERIFIED" until clinician reviews and confirms.

### 7. Notification & Communication Service (Brevo / Sendinblue)
- **Provider**: Brevo API & In-App Notification Engine
- **Purpose**: Transactional emails for appointment booking, risk escalation alerts, and payment receipts.
- **Environment variables**: EMAIL_API_KEY, EMAIL_FROM
- **Server/client**: Server-side only
- **Integration status**: Implemented with In-App DB Delivery (Key returned HTTP 401)
- **Test method**: Notification creation test, database persistence check, SIMULATED_LOCAL delivery status.
- **Limitations**: External SMTP gateway returned 401; system records notifications in database with truthful delivery status.
