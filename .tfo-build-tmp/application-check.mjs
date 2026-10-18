import env from "@next/env"
const { loadEnvConfig } = env;
loadEnvConfig(process.cwd());
const { PrismaClient } = await import("../generated/prisma/index.js");
const prisma = new PrismaClient();
const base = "http://localhost:8000";
const email = "demo.applicant@teleflow.local";
const password = "LocalDemoApplicant!2026";
const failures = [];
async function jsonRequest(path, method = "GET", cookie, body) {
  const response = await fetch(base + path, {
    method,
    headers: { ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(45000),
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}
try {
  const adminResponse = await fetch(base + "/api/auth/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "demo.admin@teleflow.local", password: "LocalDemoAdmin!2026" }),
  });
  const adminLogin = await adminResponse.json();
  const cookie = adminResponse.headers.get("set-cookie")?.split(";")[0];
  if (!adminResponse.ok || !cookie) throw new Error("admin login failed");
  const denied = await jsonRequest("/api/auth/login", "POST", undefined, { email, password });
  if (denied.status !== 401) throw new Error("applicant was able to log in before approval");
  console.log("PASS pending applicant cannot sign in before approval");
  let queue = await jsonRequest("/api/admin/clinician-applications", "GET", cookie);
  const application = queue.data?.data?.applications?.find((item) => item.email === email);
  if (queue.status !== 200 || !application) throw new Error("seeded demo application not visible to admin");
  console.log("PASS admin can view the pending synthetic application");
  let review = await jsonRequest("/api/admin/clinician-applications/" + application.id, "POST", cookie, { decision: "HOLD" });
  if (review.status !== 200 || review.data?.data?.application?.status !== "ON_HOLD") throw new Error("admin could not hold application");
  console.log("PASS admin HOLD transition");
  review = await jsonRequest("/api/admin/clinician-applications/" + application.id, "POST", cookie, { decision: "RESUME" });
  if (review.status !== 200 || review.data?.data?.application?.status !== "PENDING") throw new Error("admin could not resume application");
  console.log("PASS admin RESUME transition");
  review = await jsonRequest("/api/admin/clinician-applications/" + application.id, "POST", cookie, { decision: "APPROVE" });
  if (review.status !== 200 || review.data?.data?.application?.status !== "APPROVED") throw new Error("admin could not approve application");
  console.log("PASS admin APPROVE transition");
  const approvedLogin = await fetch(base + "/api/auth/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const approvedBody = await approvedLogin.json();
  if (!approvedLogin.ok || approvedBody.data?.user?.role !== "CLINICIAN") throw new Error("approved applicant could not sign in");
  console.log("PASS approved applicant receives clinician access");
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
} finally {
  const url = new URL(process.env.DATABASE_URL || "");
  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname) || decodeURIComponent(url.pathname.slice(1)) !== "tele_follow_up_demo") {
    throw new Error("Refusing to reset an application outside the local demo database");
  }
  const application = await prisma.clinicianRegistrationApplication.findUnique({ where: { email } });
  if (application) {
    if (application.userId) await prisma.user.delete({ where: { id: application.userId } });
    const bcrypt = (await import("bcryptjs")).default;
    await prisma.clinicianRegistrationApplication.update({
      where: { id: application.id },
      data: {
        status: "PENDING",
        passwordHash: await bcrypt.hash(password, 12),
        userId: null,
        reviewedById: null,
        reviewedAt: null,
      },
    });
    console.log("RESET demo applicant to PENDING for the next demo");
  }
  await prisma.$disconnect();
}
if (failures.length) {
  console.error("FAIL " + failures.join("; "));
  process.exitCode = 1;
} else {
  console.log("APPLICATION APPROVAL WORKFLOW PASSED");
}
