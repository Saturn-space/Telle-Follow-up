# Tele-Follow-Up Orchestrator: Member 2 Maintenance & Runbook Guide
**Module:** Member 2 — AI Risk Prediction & Clinical Decision Support  
**Branch:** `feature/member-2-phase-5-maintenance`  
**System Role:** Decision-support engine assessing post-surgical recovery safety, computing physiological risk, invoking Claude clinical synthesis, and enforcing human-in-the-loop sign-off.

---

## 1. Module Overview & Operational Boundaries

### Purpose
The Member 2 module provides structured post-operative decision support for patients recovering from specialized surgery away from their primary surgical center. It evaluates recovery logs, detects critical red flags, calculates a heuristic triage index (0–100), executes structured Claude clinical explanations, and facilitates formal clinician review and override.

### Operational Boundaries
- **Advisory Prototype Only:** The system is an assistive clinical decision support tool. It does **not** provide autonomous diagnoses, prescribe treatments, or replace qualified medical practitioners.
- **Urgent Safety Precedence:** Any acute surgical emergency (active uncontained bleeding, acute dyspnea, chest pain, wound dehiscence, severe shock index ≥ 1.0, severe bradypnea < 8/min) **strictly triggers emergency escalation**, overriding travel optimization and requiring immediate emergency hospital evaluation.
- **Human-in-the-Loop:** Automated assessments maintain `reviewStatus: 'PENDING_REVIEW'` until an authorized clinician (`SURGEON`, `LOCAL_DOCTOR`, `COORDINATOR`) signs off.

---

## 2. Architecture & File Inventory

```
lib/risk/
├── types.ts          # Core domain models (RiskLevel, ReviewStatus, AssessmentEngine, etc.)
├── rules.ts          # Deterministic physiological safety rule engine & red flag detector
├── claude.ts         # Server-side Anthropic Claude CDS adapter with schema validation
├── evaluator.ts      # Core orchestrator uniting validation, rules, AI synthesis & audit hash
└── store.ts          # Thread-safe repository managing assessments, reviews & synthetic fixtures

app/api/risk-assessments/
├── evaluate/route.ts       # POST: Triggers risk assessment
├── [assessmentId]/route.ts # GET: Retrieves assessment details
├── [assessmentId]/review/route.ts # POST: Clinician review & override
└── openapi/route.ts        # GET: Live OpenAPI 3.0 contract specification

app/api/patients/[patientId]/risk-assessments/
└── route.ts                # GET: Chronological history for authorized patient

components/risk/
├── RiskStatusBanner.tsx       # Severity badge, emergency escalation banner & review trigger
├── RiskFactorBreakdown.tsx    # Categorized clinical evidence (Vitals, Wound, Pain, Systemic)
├── DataQualityAlerts.tsx      # Missing observations & stale data warnings
├── AiSynthesisCard.tsx        # Claude CDS narrative, doctor questions & focus areas
├── ClinicianReviewDialog.tsx  # Review modal for sign-off, override & surgical escalation
├── RiskHistoryTimeline.tsx    # Longitudinal recovery progression audit log
└── PatientCaseSelector.tsx    # Synthetic case switcher & live observation boundary adjuster

scripts/
└── test-risk-engine.ts        # Comprehensive 29-test automated verification suite
```

---

## 3. Physiological Safety Rules & Thresholds

| Clinical Observation | Trigger Condition | Severity & Point Impact | Action / Safety Consequence |
| :--- | :--- | :--- | :--- |
| **Surgical Red Flags** | Active bleeding, chest pain, acute dyspnea, wound opened, syncope, urinary retention | **CRITICAL TRIGGER** (+35 pts) | `isEscalated: true`, `riskLevel: 'CRITICAL'`, travel optimization disabled. |
| **Severe Bradypnea** | Respiratory rate < 8 breaths/min | **CRITICAL TRIGGER** (+35 pts) | Emergency escalation for suspected opioid toxicity or respiratory arrest. |
| **Severe Tachypnea** | Respiratory rate ≥ 28 breaths/min | **HIGH RISK FACTOR** (+22 pts) | High risk; in-person evaluation mandated. |
| **Mild Tachypnea** | Respiratory rate ≥ 22 breaths/min | **MODERATE ELEVATION** (+12 pts) | qSOFA respiratory criterion met; clinic follow-up. |
| **Shock Index** | HR / Systolic BP ≥ 1.0 (normal < 0.7) | **CRITICAL TRIGGER** (+35 pts) | Emergency escalation for occult hemorrhage or sepsis. |
| **Severe Hypoxemia** | SpO2 < 90% on ambient air | **CRITICAL TRIGGER** (+35 pts) | Emergency escalation; immediate hospital evaluation. |
| **High Fever** | Temperature ≥ 38.5°C | **HIGH RISK FACTOR** (+35 pts) | In-person surgical site inspection required. |
| **Purulent Drainage** | Wound exudate pus/foul (with negation detection) | **HIGH RISK FACTOR** (+25 pts) | In-person wound swab & evaluation required. |
| **Severe Pain** | Pain score ≥ 8/10 | **HIGH RISK FACTOR** (+20 pts) | Breakthrough pain evaluation required. |
| **Stale Data** | Observations older than 48 hours | `STALE_DATA` Warning | Missing current vitals flagged; no false low risk. |
| **Anatomical Sanity** | Systolic BP ≤ Diastolic BP | `SUSPICIOUS_VALUE` Alert | Inconsistent measurement rejected; +25 pts. |
| **Missing Vitals** | ≥ 2 essential vitals absent and score < 20 | **INDETERMINATE** | Prevents false "Low Risk" reassurance. |

---

## 4. Role-Based Access Control (RBAC) Matrix

| Endpoint | Method | Permitted Roles | Unauthorized Action / Status Code |
| :--- | :--- | :--- | :--- |
| `/api/risk-assessments/evaluate` | POST | `SURGEON`, `LOCAL_DOCTOR`, `COORDINATOR`, `PATIENT` | Invalid inputs rejected with HTTP 400/422. |
| `/api/risk-assessments/:id` | GET | Authenticated users | Non-existent ID returns HTTP 404. |
| `/api/risk-assessments/:id/review` | POST | `SURGEON`, `LOCAL_DOCTOR`, `COORDINATOR` | Role `PATIENT` rejected with HTTP 403 `FORBIDDEN_ROLE`. |
| `/api/patients/:id/risk-assessments`| GET | Clinicians OR the specific Patient | Patient viewing another patient rejected with HTTP 403 `CROSS_PATIENT_ACCESS_DENIED`. |

---

## 5. Cross-Member Integration Handoffs

### Member 1 (Upstream Ingestion)
- **Contract Type:** `PatientRecoveryInput`
- **Fields:** `patientId`, `procedureName`, `postOpDay`, `vitals` (temp, HR, BP, SpO2, RR), `painScore`, `symptoms`, `woundDescription`.
- **Handling:** Validates realistic physiological bounds; parses clinical negations; alerts on unrecorded fields.

### Member 4 (Downstream Travel Optimization)
- **Contract Type:** `isEscalated: boolean`, `escalationReason: string | null`, `requiresInPerson: boolean`, `riskLevel: RiskLevel`.
- **Safety Invariant:** If `isEscalated === true`, Member 4 must strictly disable travel cost/distance optimization and enforce emergency referral routing.

### Member 5 (Downstream Follow-Up & Teleconsultation)
- **Contract Type:** `reviewStatus: ReviewStatus`, `requiresInPerson: boolean`, `riskLevel: RiskLevel`.
- **Safety Invariant:** Assessments with `reviewStatus: 'PENDING_REVIEW'` cannot be scheduled as clinician-approved care plans. Teleconsultation is restricted to cases where `requiresInPerson === false`.

---

## 6. Troubleshooting & Operational Runbook

### Issue: Anthropic API Returns 401 or Fails
- **Symptom:** AI status badge shows *"AI Service Fallback"* with note: `invalid x-api-key`.
- **Behavior:** Deterministic physiological rules, emergency red flags, and scoring continue operating with 100% fidelity. The system never crashes.
- **Remedy:** Configure a valid `ANTHROPIC_API_KEY` in environment secrets. Restart server.

### Issue: Patient Receives "Indeterminate" Category
- **Symptom:** Assessment shows grey "Indeterminate" badge with score index 0/100.
- **Cause:** Multiple essential vital signs (e.g., temperature and heart rate) were unrecorded.
- **Remedy:** Patient or nurse must submit an updated recovery log with measured vitals.

### Issue: Stale Observations Warning
- **Symptom:** Amber warning banner: `Recovery Observations Stale (>48 Hours Old)`.
- **Cause:** `logTimestamp` of the recovery record is older than 48 hours.
- **Remedy:** Request updated daily check-in from the patient.

---

## 7. Maintenance Verification Commands

```bash
# 1. Run ESLint check
npm run lint

# 2. Run TypeScript build compilation
npm run build

# 3. Execute 29-test automated safety & domain verification suite
npx tsx scripts/test-risk-engine.ts
```
