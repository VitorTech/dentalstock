-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "themeMode" TEXT NOT NULL DEFAULT 'system',
    "accentColor" TEXT NOT NULL DEFAULT '#0071e3',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginThrottle" (
    "key" TEXT NOT NULL,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "firstFailureAt" TIMESTAMP(3) NOT NULL,
    "blockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginThrottle_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "category" TEXT,
    "imageUrl" TEXT,
    "stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "unitCost" DOUBLE PRECISION,
    "expiresAt" TIMESTAMP(3),
    "supplierId" TEXT,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Procedure" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Procedure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcedureMaterial" (
    "id" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ProcedureMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Instrument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "imageUrl" TEXT,
    "stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Instrument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcedureInstrument" (
    "id" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ProcedureInstrument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcedureExecution" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "procedureId" TEXT,
    "procedureName" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "userName" TEXT,
    "sessionId" TEXT,
    "reversedAt" TIMESTAMP(3),
    "reversedByName" TEXT,
    "totalCost" DOUBLE PRECISION,

    CONSTRAINT "ProcedureExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcedureExecutionItem" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "materialId" TEXT,
    "unitCost" DOUBLE PRECISION,

    CONSTRAINT "ProcedureExecutionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "procedureId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "userName" TEXT,
    "note" TEXT,
    "unitCost" DOUBLE PRECISION,
    "executionId" TEXT,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "LoginThrottle_updatedAt_idx" ON "LoginThrottle"("updatedAt");

-- CreateIndex
CREATE INDEX "Material_tenantId_idx" ON "Material"("tenantId");

-- CreateIndex
CREATE INDEX "Material_name_idx" ON "Material"("name");

-- CreateIndex
CREATE INDEX "Material_supplierId_idx" ON "Material"("supplierId");

-- CreateIndex
CREATE INDEX "Material_tenantId_expiresAt_idx" ON "Material"("tenantId", "expiresAt");

-- CreateIndex
CREATE INDEX "Supplier_tenantId_idx" ON "Supplier"("tenantId");

-- CreateIndex
CREATE INDEX "Supplier_name_idx" ON "Supplier"("name");

-- CreateIndex
CREATE INDEX "Procedure_tenantId_idx" ON "Procedure"("tenantId");

-- CreateIndex
CREATE INDEX "Procedure_name_idx" ON "Procedure"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProcedureMaterial_procedureId_materialId_key" ON "ProcedureMaterial"("procedureId", "materialId");

-- CreateIndex
CREATE INDEX "Instrument_tenantId_idx" ON "Instrument"("tenantId");

-- CreateIndex
CREATE INDEX "Instrument_name_idx" ON "Instrument"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProcedureInstrument_procedureId_instrumentId_key" ON "ProcedureInstrument"("procedureId", "instrumentId");

-- CreateIndex
CREATE INDEX "ProcedureExecution_tenantId_createdAt_idx" ON "ProcedureExecution"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ProcedureExecution_sessionId_idx" ON "ProcedureExecution"("sessionId");

-- CreateIndex
CREATE INDEX "ProcedureExecutionItem_executionId_idx" ON "ProcedureExecutionItem"("executionId");

-- CreateIndex
CREATE INDEX "StockMovement_tenantId_idx" ON "StockMovement"("tenantId");

-- CreateIndex
CREATE INDEX "StockMovement_tenantId_createdAt_idx" ON "StockMovement"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_materialId_createdAt_idx" ON "StockMovement"("materialId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureMaterial" ADD CONSTRAINT "ProcedureMaterial_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureMaterial" ADD CONSTRAINT "ProcedureMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Instrument" ADD CONSTRAINT "Instrument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureInstrument" ADD CONSTRAINT "ProcedureInstrument_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureInstrument" ADD CONSTRAINT "ProcedureInstrument_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureExecution" ADD CONSTRAINT "ProcedureExecution_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureExecution" ADD CONSTRAINT "ProcedureExecution_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureExecution" ADD CONSTRAINT "ProcedureExecution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureExecutionItem" ADD CONSTRAINT "ProcedureExecutionItem_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "ProcedureExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "ProcedureExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
