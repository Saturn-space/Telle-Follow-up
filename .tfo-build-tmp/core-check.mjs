const base = "http://localhost:8000";
async function signIn(email, password) {
  const response = await fetch(base + "/api/auth/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(45000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error("login failed: " + response.status);
  return { cookie: response.headers.get("set-cookie")?.split(";")[0], user: data.data.user };
}
async function call(cookie, path, method = "GET", body) {
  const response = await fetch(base + path, {
    method,
    headers: { ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(45000),
  });
  const data = await response.json().catch(() => null);
  console.log((response.ok ? "PASS " : "FAIL ") + method + " " + path + " HTTP " + response.status);
  if (!response.ok) throw new Error((data?.error?.code || "HTTP_ERROR") + ": " + (data?.error?.message || path));
  return data;
}
const patient = await signIn("demo.patient@teleflow.local", "LocalDemoPatient!2026");
const doctor = await signIn("demo.doctor@teleflow.local", "LocalDemoDoctor!2026");
const patientId = patient.user.patientId;

const recovery = await call(patient.cookie, "/api/patients/" + encodeURIComponent(patientId) + "/recovery-logs", "POST", {
  painScore: 3, systolicBP: 118, diastolicBP: 76, heartRate: 72, temperatureC: 36.7,
  respiratoryRate: 16, oxygenSat: 98, mobilityLevel: "INDEPENDENT", symptoms: [],
  woundDescription: "Synthetic local demo verification entry.",
});
if (!recovery.data?.riskAssessment?.assessmentId) throw new Error("recovery log did not produce a risk assessment");
const assessmentId = recovery.data.riskAssessment.assessmentId;
const review = await call(doctor.cookie, "/api/risk-assessments/" + encodeURIComponent(assessmentId) + "/review", "POST", {
  decision: "ACCEPTED", clinicalNotes: "Synthetic workflow verification for the local prototype.",
});
if (review.data?.reviewStatus !== "ACCEPTED") throw new Error("clinician review did not persist");
console.log("PASS clinician review persisted");

const start = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
start.setMinutes(0, 0, 0);
const end = new Date(start.getTime() + 30 * 60 * 1000);
const appointment = await call(doctor.cookie, "/api/followup/appointments", "POST", {
  planId: "local-demo-follow-up-plan-v1",
  patientId,
  type: "TELECONSULTATION",
  scheduledStartTime: start.toISOString(),
  scheduledEndTime: end.toISOString(),
  locationOrService: "Local prototype video consultation workflow check",
  clinicalNotes: "Synthetic local demo appointment.",
});
const appointmentId = appointment.data?.data?.id;
if (!appointmentId) throw new Error("appointment was not returned");
const patientSession = await call(patient.cookie, "/api/teleconsult/sessions", "POST", { appointmentId });
const doctorSession = await call(doctor.cookie, "/api/teleconsult/sessions", "POST", { appointmentId });
if (patientSession.data?.data?.roomName !== doctorSession.data?.data?.roomName) throw new Error("patient and clinician received different room names");
console.log("PASS newly scheduled appointment is joinable by patient and assigned doctor in the same room");

const payments = await call("", "/api/payments/config");
console.log("PAYMENTS_ENABLED=" + payments.data?.data?.enabled);
const providers = await call("", "/api/providers");
const providerCount = providers.data?.data?.providers?.length ?? providers.data?.data?.facilities?.length ?? null;
console.log("PROVIDER_DIRECTORY_COUNT=" + (providerCount === null ? "response shape differs" : providerCount));
const travel = await call("", "/api/travel/health");
console.log("TRAVEL_DATABASE=" + travel.checks?.database?.status);

console.log("CORE PATIENT/CLINICIAN WORKFLOW PASSED");
