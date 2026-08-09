-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'driver');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "TripEditRequestStatus" AS ENUM ('pending', 'resolved', 'dismissed');

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(12) NOT NULL,
    "name" TEXT NOT NULL,
    "nextInvoiceNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branding" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT 'Shivam Transport',
    "tagline" TEXT NOT NULL DEFAULT 'Transport & Logistics Solutions',
    "proprietorName" TEXT NOT NULL DEFAULT '',
    "phone1" TEXT NOT NULL DEFAULT '',
    "phone2" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "gstNumber" TEXT NOT NULL DEFAULT '',
    "footerNote" TEXT NOT NULL DEFAULT 'Thank you for your business!',
    "primaryColor" TEXT NOT NULL DEFAULT '#0B2B5E',
    "accentColor" TEXT NOT NULL DEFAULT '#F0B90B',
    "logoDataUrl" TEXT,
    "signatureDataUrl" TEXT,
    "headerLeftImageDataUrl" TEXT,
    "headerRightImageDataUrl" TEXT,
    "upiQrImageDataUrl" TEXT,
    "upiQrShowOn" TEXT NOT NULL DEFAULT 'both',
    "bankName" TEXT NOT NULL DEFAULT '',
    "bankBranch" TEXT NOT NULL DEFAULT '',
    "bankAccountNumber" TEXT NOT NULL DEFAULT '',
    "bankIfsc" TEXT NOT NULL DEFAULT '',
    "publicServerUrl" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Branding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "bankName" TEXT NOT NULL DEFAULT '',
    "bankBranch" TEXT NOT NULL DEFAULT '',
    "accountNumber" TEXT NOT NULL DEFAULT '',
    "ifscCode" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "userCode" TEXT,
    "passwordHash" TEXT NOT NULL,
    "email" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "resetOtpHash" TEXT,
    "resetOtpExpiresAt" TIMESTAMP(3),
    "resetOtpAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ip" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "gstNumber" TEXT NOT NULL DEFAULT '',
    "advanceBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvanceEntry" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "usedInBillNo" TEXT,
    "usedInBillId" TEXT,

    CONSTRAINT "AdvanceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL DEFAULT '',
    "customerAddress" TEXT NOT NULL DEFAULT '',
    "driverId" TEXT,
    "driverName" TEXT NOT NULL,
    "driverCode" TEXT NOT NULL DEFAULT '',
    "date" TIMESTAMP(3) NOT NULL,
    "pickupLocation" TEXT NOT NULL,
    "dropLocation" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "advanceAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paymentMode" TEXT NOT NULL DEFAULT '',
    "paymentNote" TEXT NOT NULL DEFAULT '',
    "paidAt" TIMESTAMP(3),
    "vehicleType" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL DEFAULT '',
    "materialType" TEXT NOT NULL DEFAULT '',
    "status" "TripStatus" NOT NULL DEFAULT 'pending',
    "rejectionReason" TEXT NOT NULL DEFAULT '',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "clientRequestId" TEXT,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "billNo" TEXT NOT NULL,
    "billDate" TIMESTAMP(3) NOT NULL,
    "isGstBill" BOOLEAN NOT NULL DEFAULT false,
    "gstPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "received" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "gstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "advanceApplied" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netPayable" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amountInWords" TEXT NOT NULL DEFAULT '',
    "customerPhone" TEXT NOT NULL DEFAULT '',
    "customerAddress" TEXT NOT NULL DEFAULT '',
    "customerGst" TEXT NOT NULL DEFAULT '',
    "bankName" TEXT NOT NULL DEFAULT '',
    "bankBranch" TEXT NOT NULL DEFAULT '',
    "accountNumber" TEXT NOT NULL DEFAULT '',
    "ifscCode" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillTripLine" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "tripId" TEXT,
    "date" TIMESTAMP(3),
    "pickupLocation" TEXT NOT NULL DEFAULT '',
    "dropLocation" TEXT NOT NULL DEFAULT '',
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "BillTripLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleDocument" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "reminderDaysBefore" INTEGER NOT NULL DEFAULT 7,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripEditRequest" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "TripEditRequestStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "TripEditRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Group_code_key" ON "Group"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Branding_groupId_key" ON "Branding"("groupId");

-- CreateIndex
CREATE INDEX "BankAccount_groupId_idx" ON "BankAccount"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "User_userCode_key" ON "User"("userCode");

-- CreateIndex
CREATE INDEX "User_groupId_idx" ON "User"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "User_groupId_phone_key" ON "User"("groupId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Customer_groupId_idx" ON "Customer"("groupId");

-- CreateIndex
CREATE INDEX "Customer_groupId_name_idx" ON "Customer"("groupId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_groupId_name_key" ON "Customer"("groupId", "name");

-- CreateIndex
CREATE INDEX "AdvanceEntry_groupId_idx" ON "AdvanceEntry"("groupId");

-- CreateIndex
CREATE INDEX "AdvanceEntry_customerId_deleted_date_idx" ON "AdvanceEntry"("customerId", "deleted", "date");

-- CreateIndex
CREATE INDEX "Trip_groupId_idx" ON "Trip"("groupId");

-- CreateIndex
CREATE INDEX "Trip_groupId_status_idx" ON "Trip"("groupId", "status");

-- CreateIndex
CREATE INDEX "Trip_customerId_idx" ON "Trip"("customerId");

-- CreateIndex
CREATE INDEX "Trip_driverId_idx" ON "Trip"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_groupId_clientRequestId_key" ON "Trip"("groupId", "clientRequestId");

-- CreateIndex
CREATE INDEX "Bill_groupId_idx" ON "Bill"("groupId");

-- CreateIndex
CREATE INDEX "Bill_groupId_deleted_idx" ON "Bill"("groupId", "deleted");

-- CreateIndex
CREATE INDEX "Bill_customerId_idx" ON "Bill"("customerId");

-- CreateIndex
CREATE INDEX "BillTripLine_billId_idx" ON "BillTripLine"("billId");

-- CreateIndex
CREATE INDEX "BillTripLine_tripId_idx" ON "BillTripLine"("tripId");

-- CreateIndex
CREATE INDEX "AuditLog_groupId_idx" ON "AuditLog"("groupId");

-- CreateIndex
CREATE INDEX "AuditLog_groupId_createdAt_idx" ON "AuditLog"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "Vehicle_groupId_idx" ON "Vehicle"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_groupId_vehicleNumber_key" ON "Vehicle"("groupId", "vehicleNumber");

-- CreateIndex
CREATE INDEX "VehicleDocument_vehicleId_idx" ON "VehicleDocument"("vehicleId");

-- CreateIndex
CREATE INDEX "TripEditRequest_groupId_idx" ON "TripEditRequest"("groupId");

-- CreateIndex
CREATE INDEX "TripEditRequest_tripId_idx" ON "TripEditRequest"("tripId");

-- AddForeignKey
ALTER TABLE "Branding" ADD CONSTRAINT "Branding_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvanceEntry" ADD CONSTRAINT "AdvanceEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvanceEntry" ADD CONSTRAINT "AdvanceEntry_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvanceEntry" ADD CONSTRAINT "AdvanceEntry_usedInBillId_fkey" FOREIGN KEY ("usedInBillId") REFERENCES "Bill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillTripLine" ADD CONSTRAINT "BillTripLine_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillTripLine" ADD CONSTRAINT "BillTripLine_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripEditRequest" ADD CONSTRAINT "TripEditRequest_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripEditRequest" ADD CONSTRAINT "TripEditRequest_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripEditRequest" ADD CONSTRAINT "TripEditRequest_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

