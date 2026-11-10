-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STAFF', 'CLIENT');

-- CreateEnum
CREATE TYPE "IntakeStatus" AS ENUM ('NOVO', 'EM_TRIAGEM', 'CONVERTIDO', 'DESCARTADO');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('SITE', 'SISTEMA', 'APP', 'BOT');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('BRIEFING_RECEBIDO', 'EM_ANALISE', 'PROPOSTA_ENVIADA', 'APROVADO', 'EM_ANDAMENTO', 'AGUARDANDO_CLIENTE', 'EM_REVISAO', 'PUBLICADO', 'EM_SUPORTE', 'CONCLUIDO', 'PAUSADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "ProjectPhase" AS ENUM ('DESCOBERTA', 'PLANEJAMENTO_DESIGN', 'DESENVOLVIMENTO', 'ENTREGA_SUPORTE');

-- CreateEnum
CREATE TYPE "StageStatus" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'PULADA');

-- CreateEnum
CREATE TYPE "UpdateType" AS ENUM ('STATUS', 'ETAPA', 'COMENTARIO', 'ARQUIVO', 'MARCO');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('INTERNA', 'CLIENTE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL,
    "clientId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" VARCHAR(14),
    "segment" TEXT,
    "city" TEXT,
    "state" VARCHAR(2),
    "currentWebsite" TEXT,
    "instagram" TEXT,
    "facebook" TEXT,
    "linkedin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intake" (
    "id" TEXT NOT NULL,
    "protocol" VARCHAR(32) NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "source" VARCHAR(64) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "IntakeStatus" NOT NULL DEFAULT 'NOVO',
    "consentAt" TIMESTAMP(3) NOT NULL,
    "consentTextVersion" VARCHAR(16) NOT NULL,
    "requestIpHash" VARCHAR(64),
    "idempotencyKey" VARCHAR(64),
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Intake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ProjectType" NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'BRIEFING_RECEBIDO',
    "clientId" TEXT NOT NULL,
    "expectedStartAt" TIMESTAMP(3),
    "expectedEndAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectStage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "name" TEXT NOT NULL,
    "phase" "ProjectPhase" NOT NULL,
    "status" "StageStatus" NOT NULL DEFAULT 'PENDENTE',
    "isApprovalPoint" BOOLEAN NOT NULL DEFAULT false,
    "expectedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectUpdate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stageId" TEXT,
    "authorId" TEXT NOT NULL,
    "type" "UpdateType" NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'INTERNA',
    "text" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagicLinkToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "requestIp" VARCHAR(45),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_clientId_idx" ON "User"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_cnpj_key" ON "Client"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Intake_protocol_key" ON "Intake"("protocol");

-- CreateIndex
CREATE UNIQUE INDEX "Intake_idempotencyKey_key" ON "Intake"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Intake_clientId_idx" ON "Intake"("clientId");

-- CreateIndex
CREATE INDEX "Intake_status_createdAt_idx" ON "Intake"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Project_code_key" ON "Project"("code");

-- CreateIndex
CREATE INDEX "Project_clientId_status_idx" ON "Project"("clientId", "status");

-- CreateIndex
CREATE INDEX "Project_status_updatedAt_idx" ON "Project"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "ProjectStage_projectId_status_idx" ON "ProjectStage"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectStage_projectId_order_key" ON "ProjectStage"("projectId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectStage_projectId_key_key" ON "ProjectStage"("projectId", "key");

-- CreateIndex
CREATE INDEX "ProjectUpdate_projectId_visibility_createdAt_idx" ON "ProjectUpdate"("projectId", "visibility", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MagicLinkToken_tokenHash_key" ON "MagicLinkToken"("tokenHash");

-- CreateIndex
CREATE INDEX "MagicLinkToken_userId_idx" ON "MagicLinkToken"("userId");

-- CreateIndex
CREATE INDEX "MagicLinkToken_expiresAt_idx" ON "MagicLinkToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intake" ADD CONSTRAINT "Intake_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intake" ADD CONSTRAINT "Intake_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectStage" ADD CONSTRAINT "ProjectStage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUpdate" ADD CONSTRAINT "ProjectUpdate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUpdate" ADD CONSTRAINT "ProjectUpdate_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "ProjectStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUpdate" ADD CONSTRAINT "ProjectUpdate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagicLinkToken" ADD CONSTRAINT "MagicLinkToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint (escrito à mão — o Prisma Schema Language não tem CHECK
-- nativo; a integridade abaixo é só do banco, não depende do código da
-- aplicação lembrar de respeitá-la. Ver comentário em `model User` no
-- schema.prisma.)
--
-- 1) role e clientId não podem ficar inconsistentes: STAFF nunca tem
--    empresa; CLIENT sempre tem.
ALTER TABLE "User" ADD CONSTRAINT "User_role_clientId_check" CHECK (
  ("role" = 'STAFF' AND "clientId" IS NULL) OR
  ("role" = 'CLIENT' AND "clientId" IS NOT NULL)
);

-- 2) e-mail sempre normalizado em minúsculas — se a aplicação esquecer de
--    normalizar antes de gravar, o INSERT/UPDATE falha em vez de criar um
--    duplicado funcional ("Ana@x.com" convivendo com "ana@x.com").
ALTER TABLE "User" ADD CONSTRAINT "User_email_lowercase_check" CHECK (
  "email" = lower("email")
);
