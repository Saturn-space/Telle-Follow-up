const base = "http://localhost:8000";
const accounts = {
  patient: { email: "demo.patient@teleflow.local", password: "LocalDemoPatient!2026", role: "PATIENT" },
  doctor: { email: "demo.doctor@teleflow.local", password: "LocalDemoDoctor!2026", role: "CLINICIAN" },
  admin: { email: "demo.admin@teleflow.local", password: "LocalDemoAdmin!2026", role: "ADMIN" },
};
const failures = [];
async function request(cookie, path, init = {}) {
  const response = await fetch(base + path, {
    ...init,
    headers: { ...(init.body ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}), ...init.headers },
    signal: AbortSignal.timeout(45000),
  });
  let data;
  try { data = await response.json(); } catch {}
  return { status: response.status, data };
}
async function login(account, label) {
  const response = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: account.email, password: account.password }),
    signal: AbortSignal.timeout(45000),
  });
  const data = await response.json();
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (!response.ok || !data.success || !cookie || data.data.user.role !== account.role) {
    throw new Error(label + " login failed with HTTP " + response.status);
  }
  return { cookie, user: data.data.user };
}
function check(label, actual, expected) {
  const ok = actual.status === expected;
  console.log((ok ? "PASS " : "FAIL ") + label + " HTTP " + actual.status + " expected " + expected);
  if (!ok) failures.push(label + " returned " + actual.status + " (" + (actual.data?.error?.code || "no error code") + ")");
  return actual;
}
const patient = await login(accounts.patient, "patient");
const doctor = await login(accounts.doctor, "doctor");
const admin = await login(accounts.admin, "admin");
console.log("PASS demo logins PATIENT, CLINICIAN, ADMIN");
const patientId = patient.user.patientId;
const appointmentId = "local-demo-teleconsult-v1";

for (const path of [
  "/api/auth/me",
  "/api/integration/cross-module?patientId=" + encodeURIComponent(patientId),
  "/api/followup/plans?limit=10",
  "/api/followup/appointments?limit=100",
  "/api/patients/" + encodeURIComponent(patientId) + "/recovery-logs",
  "/api/patients/" + encodeURIComponent(patientId) + "/risk-assessments",
  "/api/documents",
  "/api/notifications",
  "/api/payments/my-payments",
]) check("patient " + path.split("?")[0], await request(patient.cookie, path), 200);
check("patient is denied admin records", await request(patient.cookie, "/api/admin/patients"), 403);

for (const path of [
  "/api/auth/me",
  "/api/clinician/patients",
  "/api/followup/plans?limit=10",
  "/api/followup/appointments?limit=100",
  "/api/integration/cross-module?patientId=" + encodeURIComponent(patientId),
  "/api/teleconsult/sessions?appointmentId=" + appointmentId,
]) check("doctor " + path.split("?")[0], await request(doctor.cookie, path), 200);
check("doctor is denied admin records", await request(doctor.cookie, "/api/admin/patients"), 403);

for (const path of [
  "/api/auth/me",
  "/api/admin/system-status",
  "/api/admin/users",
  "/api/admin/patients",
  "/api/admin/appointments",
  "/api/admin/audit-logs",
  "/api/admin/clinician-applications",
]) check("admin " + path, await request(admin.cookie, path), 200);
check("admin is denied clinician-only queue", await request(admin.cookie, "/api/clinician/patients"), 403);

check("payments config", await request("", "/api/payments/config"), 200);
check("document config", await request("", "/api/documents/config"), 200);

const patientSession = check("patient opens seeded video session", await request(patient.cookie, "/api/teleconsult/sessions", {
  method: "POST", body: JSON.stringify({ appointmentId }),
}), 200);
const doctorSession = check("assigned doctor opens same video session", await request(doctor.cookie, "/api/teleconsult/sessions", {
  method: "POST", body: JSON.stringify({ appointmentId }),
}), 200);
if (patientSession.data?.data?.roomName && patientSession.data.data.roomName === doctorSession.data?.data?.roomName) {
  console.log("PASS patient and doctor receive the same video room");
} else {
  failures.push("video session room did not match between patient and doctor");
  console.log("FAIL patient and doctor receive the same video room");
}
if (failures.length) {
  console.error("FAILURES " + failures.join("; "));
  process.exitCode = 1;
} else {
  console.log("ALL ROLE AND VIDEO API CHECKS PASSED");
}
