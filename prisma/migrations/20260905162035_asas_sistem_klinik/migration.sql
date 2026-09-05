-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DOCTOR', 'NURSE', 'FRONTDESK', 'PHARMACY');

-- CreateEnum
CREATE TYPE "IdType" AS ENUM ('MYKAD', 'MYKID', 'PASSPORT', 'POLIS_TENTERA', 'LAIN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('LELAKI', 'PEREMPUAN');

-- CreateEnum
CREATE TYPE "VisitType" AS ENUM ('WALKIN', 'APPOINTMENT');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('REGISTERED', 'WAITING', 'IN_CONSULT', 'DISPENSING', 'PAYMENT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayerType" AS ENUM ('SELF', 'PANEL', 'MADANI', 'PEKA_B40');

-- CreateEnum
CREATE TYPE "AllergySeverity" AS ENUM ('RINGAN', 'SEDERHANA', 'TERUK');

-- CreateEnum
CREATE TYPE "DrugForm" AS ENUM ('TABLET', 'KAPSUL', 'SIRAP', 'KRIM', 'SALAP', 'TITIS', 'SUNTIKAN', 'SEMBUR', 'SUPPOSITORI', 'LAIN');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('RECEIVE', 'DISPENSE', 'ADJUST', 'RETURN', 'EXPIRE');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('KONSULTASI', 'PROSEDUR', 'SUNTIKAN', 'UJIAN', 'LAIN');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'PARTIAL', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'DUITNOW_QR', 'EWALLET', 'PANEL');

-- CreateEnum
CREATE TYPE "PanelType" AS ENUM ('CORPORATE', 'TPA', 'GOVT');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PAID', 'PARTIAL', 'REJECTED');

-- CreateEnum
CREATE TYPE "LabProvider" AS ENUM ('PATHLAB', 'BP_HEALTHCARE', 'GRIBBLES', 'LAIN');

-- CreateEnum
CREATE TYPE "LabOrderStatus" AS ENUM ('ORDERED', 'COLLECTED', 'RESULT_READY', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocStatus" AS ENUM ('ACTIVE', 'VOID');

-- CreateTable
CREATE TABLE "Clinic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registrationNo" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "postcode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'Selangor',
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "logoPath" TEXT,
    "tin" TEXT,
    "sstRegistered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "mmcNumber" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NumberSequence" (
    "key" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT '',
    "current" INTEGER NOT NULL DEFAULT 0,
    "padding" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "NumberSequence_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "mrn" TEXT NOT NULL,
    "idType" "IdType" NOT NULL DEFAULT 'MYKAD',
    "idNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dob" DATE,
    "gender" "Gender" NOT NULL,
    "birthState" TEXT,
    "nationality" TEXT NOT NULL DEFAULT 'Malaysia',
    "race" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "postcode" TEXT,
    "city" TEXT,
    "state" TEXT,
    "occupation" TEXT,
    "bloodGroup" TEXT,
    "emergencyName" TEXT,
    "emergencyPhone" TEXT,
    "emergencyRelation" TEXT,
    "notes" TEXT,
    "consentGivenAt" TIMESTAMP(3),
    "consentVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientAllergy" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "allergen" TEXT NOT NULL,
    "reaction" TEXT,
    "severity" "AllergySeverity" NOT NULL DEFAULT 'SEDERHANA',
    "notedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientAllergy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" "VisitType" NOT NULL DEFAULT 'WALKIN',
    "status" "VisitStatus" NOT NULL DEFAULT 'REGISTERED',
    "queueNumber" INTEGER NOT NULL,
    "queueDate" DATE NOT NULL,
    "doctorId" TEXT,
    "payerType" "PayerType" NOT NULL DEFAULT 'SELF',
    "panelId" TEXT,
    "employeeId" TEXT,
    "glNumber" TEXT,
    "arrivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vitals" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "temperature" DECIMAL(4,1),
    "systolic" INTEGER,
    "diastolic" INTEGER,
    "pulse" INTEGER,
    "respiratoryRate" INTEGER,
    "spo2" INTEGER,
    "weightKg" DECIMAL(5,2),
    "heightCm" DECIMAL(5,1),
    "bmi" DECIMAL(4,1),
    "bloodGlucose" DECIMAL(4,1),
    "recordedById" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consultation" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "presentingComplaint" TEXT,
    "history" TEXT,
    "examination" TEXT,
    "notes" TEXT,
    "disposition" TEXT,
    "followUpDate" DATE,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Consultation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Diagnosis" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "icd10Code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Diagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Icd10Code" (
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,

    CONSTRAINT "Icd10Code_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Drug" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genericName" TEXT,
    "strength" TEXT,
    "form" "DrugForm" NOT NULL DEFAULT 'TABLET',
    "unit" TEXT NOT NULL DEFAULT 'biji',
    "isControlled" BOOLEAN NOT NULL DEFAULT false,
    "defaultDose" TEXT,
    "defaultFrequency" TEXT,
    "defaultDuration" INTEGER,
    "instructionsMs" TEXT,
    "instructionsEn" TEXT,
    "sellPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Drug_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrugBatch" (
    "id" TEXT NOT NULL,
    "drugId" TEXT NOT NULL,
    "batchNo" TEXT NOT NULL,
    "expiryDate" DATE NOT NULL,
    "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
    "costPrice" DECIMAL(10,2),
    "supplier" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrugBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "drugId" TEXT NOT NULL,
    "batchId" TEXT,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "reason" TEXT,
    "performedById" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionItem" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "drugId" TEXT NOT NULL,
    "dose" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "instructions" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "dispensedBatchId" TEXT,
    "dispensedById" TEXT,
    "dispensedAt" TIMESTAMP(3),
    "overrideReason" TEXT,

    CONSTRAINT "PrescriptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceItem" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL DEFAULT 'KONSULTASI',
    "price" DECIMAL(10,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ServiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "payerType" "PayerType" NOT NULL DEFAULT 'SELF',
    "panelId" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "issuedById" TEXT,
    "issuedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "buyerTin" TEXT,
    "einvoiceUuid" TEXT,
    "einvoiceStatus" TEXT,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "refId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reference" TEXT,
    "receivedById" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Panel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PanelType" NOT NULL DEFAULT 'CORPORATE',
    "clinicCode" TEXT,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "billingCycle" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "Panel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PanelClaim" (
    "id" TEXT NOT NULL,
    "claimNo" TEXT NOT NULL,
    "panelId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PanelClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PanelClaimItem" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "PanelClaimItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalCertificate" (
    "id" TEXT NOT NULL,
    "serialNo" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "days" INTEGER NOT NULL,
    "reason" TEXT,
    "status" "DocStatus" NOT NULL DEFAULT 'ACTIVE',
    "voidReason" TEXT,
    "voidedById" TEXT,
    "voidedAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralLetter" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "toFacility" TEXT NOT NULL,
    "toDoctor" TEXT,
    "specialty" TEXT,
    "reason" TEXT NOT NULL,
    "clinicalSummary" TEXT,
    "issuedById" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralLetter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabOrder" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "provider" "LabProvider" NOT NULL DEFAULT 'PATHLAB',
    "tests" TEXT[],
    "clinicalNote" TEXT,
    "status" "LabOrderStatus" NOT NULL DEFAULT 'ORDERED',
    "orderedById" TEXT NOT NULL,
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultNotes" TEXT,
    "resultAt" TIMESTAMP(3),

    CONSTRAINT "LabOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_role_active_idx" ON "User"("role", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_at_idx" ON "AuditLog"("actorId", "at");

-- CreateIndex
CREATE INDEX "AuditLog_at_idx" ON "AuditLog"("at");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_mrn_key" ON "Patient"("mrn");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_idNumber_key" ON "Patient"("idNumber");

-- CreateIndex
CREATE INDEX "Patient_name_idx" ON "Patient"("name");

-- CreateIndex
CREATE INDEX "Patient_phone_idx" ON "Patient"("phone");

-- CreateIndex
CREATE INDEX "PatientAllergy_patientId_idx" ON "PatientAllergy"("patientId");

-- CreateIndex
CREATE INDEX "Visit_status_queueDate_idx" ON "Visit"("status", "queueDate");

-- CreateIndex
CREATE INDEX "Visit_patientId_arrivedAt_idx" ON "Visit"("patientId", "arrivedAt");

-- CreateIndex
CREATE INDEX "Visit_panelId_arrivedAt_idx" ON "Visit"("panelId", "arrivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Visit_queueDate_queueNumber_key" ON "Visit"("queueDate", "queueNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Vitals_visitId_key" ON "Vitals"("visitId");

-- CreateIndex
CREATE UNIQUE INDEX "Consultation_visitId_key" ON "Consultation"("visitId");

-- CreateIndex
CREATE INDEX "Consultation_doctorId_startedAt_idx" ON "Consultation"("doctorId", "startedAt");

-- CreateIndex
CREATE INDEX "Diagnosis_consultationId_idx" ON "Diagnosis"("consultationId");

-- CreateIndex
CREATE INDEX "Diagnosis_icd10Code_idx" ON "Diagnosis"("icd10Code");

-- CreateIndex
CREATE INDEX "Icd10Code_description_idx" ON "Icd10Code"("description");

-- CreateIndex
CREATE UNIQUE INDEX "Drug_name_key" ON "Drug"("name");

-- CreateIndex
CREATE INDEX "Drug_active_idx" ON "Drug"("active");

-- CreateIndex
CREATE INDEX "DrugBatch_drugId_expiryDate_idx" ON "DrugBatch"("drugId", "expiryDate");

-- CreateIndex
CREATE INDEX "DrugBatch_expiryDate_idx" ON "DrugBatch"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "DrugBatch_drugId_batchNo_expiryDate_key" ON "DrugBatch"("drugId", "batchNo", "expiryDate");

-- CreateIndex
CREATE INDEX "StockMovement_drugId_at_idx" ON "StockMovement"("drugId", "at");

-- CreateIndex
CREATE INDEX "StockMovement_batchId_idx" ON "StockMovement"("batchId");

-- CreateIndex
CREATE INDEX "StockMovement_referenceType_referenceId_idx" ON "StockMovement"("referenceType", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "Prescription_visitId_key" ON "Prescription"("visitId");

-- CreateIndex
CREATE INDEX "PrescriptionItem_prescriptionId_idx" ON "PrescriptionItem"("prescriptionId");

-- CreateIndex
CREATE INDEX "PrescriptionItem_drugId_idx" ON "PrescriptionItem"("drugId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceItem_code_key" ON "ServiceItem"("code");

-- CreateIndex
CREATE INDEX "ServiceItem_active_category_idx" ON "ServiceItem"("active", "category");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNo_key" ON "Invoice"("invoiceNo");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_visitId_key" ON "Invoice"("visitId");

-- CreateIndex
CREATE INDEX "Invoice_status_issuedAt_idx" ON "Invoice"("status", "issuedAt");

-- CreateIndex
CREATE INDEX "Invoice_panelId_status_idx" ON "Invoice"("panelId", "status");

-- CreateIndex
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "Payment_receivedAt_idx" ON "Payment"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Panel_name_key" ON "Panel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PanelClaim_claimNo_key" ON "PanelClaim"("claimNo");

-- CreateIndex
CREATE INDEX "PanelClaim_panelId_status_idx" ON "PanelClaim"("panelId", "status");

-- CreateIndex
CREATE INDEX "PanelClaimItem_claimId_idx" ON "PanelClaimItem"("claimId");

-- CreateIndex
CREATE UNIQUE INDEX "PanelClaimItem_invoiceId_key" ON "PanelClaimItem"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalCertificate_serialNo_key" ON "MedicalCertificate"("serialNo");

-- CreateIndex
CREATE INDEX "MedicalCertificate_visitId_idx" ON "MedicalCertificate"("visitId");

-- CreateIndex
CREATE INDEX "MedicalCertificate_issuedAt_idx" ON "MedicalCertificate"("issuedAt");

-- CreateIndex
CREATE INDEX "ReferralLetter_visitId_idx" ON "ReferralLetter"("visitId");

-- CreateIndex
CREATE INDEX "LabOrder_visitId_idx" ON "LabOrder"("visitId");

-- CreateIndex
CREATE INDEX "LabOrder_status_idx" ON "LabOrder"("status");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAllergy" ADD CONSTRAINT "PatientAllergy_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "Panel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vitals" ADD CONSTRAINT "Vitals_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vitals" ADD CONSTRAINT "Vitals_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrugBatch" ADD CONSTRAINT "DrugBatch_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "Drug"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "Drug"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "DrugBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "Drug"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_dispensedBatchId_fkey" FOREIGN KEY ("dispensedBatchId") REFERENCES "DrugBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_dispensedById_fkey" FOREIGN KEY ("dispensedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "Panel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanelClaim" ADD CONSTRAINT "PanelClaim_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "Panel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanelClaimItem" ADD CONSTRAINT "PanelClaimItem_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "PanelClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanelClaimItem" ADD CONSTRAINT "PanelClaimItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalCertificate" ADD CONSTRAINT "MedicalCertificate_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalCertificate" ADD CONSTRAINT "MedicalCertificate_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalCertificate" ADD CONSTRAINT "MedicalCertificate_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralLetter" ADD CONSTRAINT "ReferralLetter_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralLetter" ADD CONSTRAINT "ReferralLetter_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_orderedById_fkey" FOREIGN KEY ("orderedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
