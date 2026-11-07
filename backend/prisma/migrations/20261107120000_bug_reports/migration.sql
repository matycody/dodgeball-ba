-- CreateEnum
CREATE TYPE "ReportKind" AS ENUM ('ERROR', 'VISUAL', 'SUGGESTION', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('NEW', 'IN_REVIEW', 'RESOLVED', 'DISCARDED');

-- CreateTable
CREATE TABLE "BugReport" (
    "id" TEXT NOT NULL,
    "kind" "ReportKind" NOT NULL DEFAULT 'ERROR',
    "message" VARCHAR(2000) NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'NEW',
    "page" VARCHAR(300),
    "userAgent" VARCHAR(300),
    "viewport" VARCHAR(20),
    "consoleErrors" JSONB,
    "contactEmail" VARCHAR(120),
    "userId" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "uploadKey" TEXT NOT NULL,
    "adminNote" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "BugReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BugReport_status_createdAt_idx" ON "BugReport"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "BugReport" ADD CONSTRAINT "BugReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
