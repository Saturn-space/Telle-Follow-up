CREATE TYPE "ClinicianApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "ClinicianRegistrationApplication" (
  "id" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT,
  "medicalLicenseNumber" TEXT NOT NULL,
  "specialty" TEXT NOT NULL,
  "institution" TEXT NOT NULL,
  "phone" TEXT,
  "city" TEXT,
  "status" "ClinicianApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClinicianRegistrationApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClinicianRegistrationApplication_email_key"
  ON "ClinicianRegistrationApplication"("email");
CREATE UNIQUE INDEX "ClinicianRegistrationApplication_userId_key"
  ON "ClinicianRegistrationApplication"("userId");
CREATE INDEX "ClinicianRegistrationApplication_status_createdAt_idx"
  ON "ClinicianRegistrationApplication"("status", "createdAt");

ALTER TABLE "ClinicianRegistrationApplication"
  ADD CONSTRAINT "ClinicianRegistrationApplication_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClinicianRegistrationApplication"
  ADD CONSTRAINT "ClinicianRegistrationApplication_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
