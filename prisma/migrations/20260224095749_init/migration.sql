-- CreateEnum
CREATE TYPE "ChoreCategory" AS ENUM ('CLEANING', 'COOKING', 'LAUNDRY', 'MAINTENANCE', 'SHOPPING', 'OTHER');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "FrequencyType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'AS_NEEDED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ChoreHistoryAction" AS ENUM ('ASSIGNED', 'COMPLETED', 'SKIPPED', 'REASSIGNED');

-- CreateEnum
CREATE TYPE "SituationStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SituationItemStatus" AS ENUM ('PENDING', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "MemoryContextType" AS ENUM ('HOUSEHOLD_PREFERENCES', 'CHORE_PATTERNS', 'SITUATION_HISTORY');

-- CreateEnum
CREATE TYPE "AssignmentEventType" AS ENUM ('CREATED', 'REASSIGNED', 'COMPLETED', 'SKIPPED', 'DUE_DATE_CHANGED', 'NOTES_UPDATED');

-- CreateEnum
CREATE TYPE "SuggestionFeedbackAction" AS ENUM ('ACCEPTED', 'MODIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SourceChannel" AS ENUM ('UI', 'TEXT', 'VOICE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AuthAuditEventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGIN_BLOCKED', 'LOCKOUT_TRIGGERED', 'LOGOUT');

-- CreateEnum
CREATE TYPE "SummaryType" AS ENUM ('ASSIGNEE_PREFERENCE', 'TIMING_PATTERN', 'SITUATION_PATTERN', 'GENERAL');

-- CreateEnum
CREATE TYPE "GamificationEventType" AS ENUM ('CHORE_COMPLETED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockoutUntil" TIMESTAMP(3),
    "lastFailedLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chore" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "ChoreCategory" NOT NULL DEFAULT 'OTHER',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 10,
    "baseUrgencyPoints" INTEGER NOT NULL DEFAULT 5,
    "urgencyGrowthPerDay" INTEGER NOT NULL DEFAULT 1,
    "urgencyMaxPoints" INTEGER NOT NULL DEFAULT 10,
    "frequencyType" "FrequencyType" NOT NULL DEFAULT 'WEEKLY',
    "frequencyValue" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "defaultAssigneeId" TEXT,
    "nextDueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoreAssignment" (
    "id" TEXT NOT NULL,
    "choreId" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ChoreAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoreHistory" (
    "id" TEXT NOT NULL,
    "choreId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "ChoreHistoryAction" NOT NULL,
    "notes" TEXT,
    "assignmentId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChoreHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentEvent" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "eventType" "AssignmentEventType" NOT NULL,
    "sourceChannel" "SourceChannel" NOT NULL DEFAULT 'UI',
    "metadata" JSONB,
    "suggestionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialSituation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rawInput" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3),
    "status" "SituationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "SpecialSituation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SituationItem" (
    "id" TEXT NOT NULL,
    "situationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedToId" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "SituationItemStatus" NOT NULL DEFAULT 'PENDING',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "suggestedBy" TEXT,
    "suggestionReason" TEXT,
    "suggestionConfidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SituationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiFeedbackEvent" (
    "id" TEXT NOT NULL,
    "contextType" TEXT NOT NULL,
    "suggestionId" TEXT NOT NULL,
    "action" "SuggestionFeedbackAction" NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "sourceChannel" "SourceChannel" NOT NULL DEFAULT 'UI',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiFeedbackEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthAuditEvent" (
    "id" TEXT NOT NULL,
    "type" "AuthAuditEventType" NOT NULL,
    "userId" TEXT,
    "attemptedUsername" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmMemory" (
    "id" TEXT NOT NULL,
    "contextType" "MemoryContextType" NOT NULL,
    "summary" TEXT NOT NULL,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LlmMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemorySummary" (
    "id" TEXT NOT NULL,
    "summaryType" "SummaryType" NOT NULL,
    "subjectKey" TEXT,
    "summaryText" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "sourceWindowStart" TIMESTAMP(3),
    "sourceWindowEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemorySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamificationState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentPoints" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastCompletionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GamificationState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamificationEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "GamificationEventType" NOT NULL,
    "pointsDelta" INTEGER NOT NULL DEFAULT 0,
    "assignmentId" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GamificationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_lockoutUntil_idx" ON "User"("lockoutUntil");

-- CreateIndex
CREATE UNIQUE INDEX "Chore_name_key" ON "Chore"("name");

-- CreateIndex
CREATE INDEX "Chore_isActive_priority_idx" ON "Chore"("isActive", "priority");

-- CreateIndex
CREATE INDEX "Chore_nextDueAt_idx" ON "Chore"("nextDueAt");

-- CreateIndex
CREATE INDEX "ChoreAssignment_assignedToId_status_dueDate_idx" ON "ChoreAssignment"("assignedToId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "ChoreAssignment_choreId_dueDate_idx" ON "ChoreAssignment"("choreId", "dueDate");

-- CreateIndex
CREATE INDEX "ChoreHistory_userId_timestamp_idx" ON "ChoreHistory"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "ChoreHistory_choreId_timestamp_idx" ON "ChoreHistory"("choreId", "timestamp");

-- CreateIndex
CREATE INDEX "AssignmentEvent_assignmentId_createdAt_idx" ON "AssignmentEvent"("assignmentId", "createdAt");

-- CreateIndex
CREATE INDEX "AssignmentEvent_actorUserId_createdAt_idx" ON "AssignmentEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "SpecialSituation_createdById_createdAt_idx" ON "SpecialSituation"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "SituationItem_situationId_displayOrder_idx" ON "SituationItem"("situationId", "displayOrder");

-- CreateIndex
CREATE INDEX "SituationItem_assignedToId_status_idx" ON "SituationItem"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "AiFeedbackEvent_contextType_createdAt_idx" ON "AiFeedbackEvent"("contextType", "createdAt");

-- CreateIndex
CREATE INDEX "AiFeedbackEvent_suggestionId_createdAt_idx" ON "AiFeedbackEvent"("suggestionId", "createdAt");

-- CreateIndex
CREATE INDEX "AiFeedbackEvent_actorUserId_createdAt_idx" ON "AiFeedbackEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuthAuditEvent_type_createdAt_idx" ON "AuthAuditEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "AuthAuditEvent_attemptedUsername_createdAt_idx" ON "AuthAuditEvent"("attemptedUsername", "createdAt");

-- CreateIndex
CREATE INDEX "AuthAuditEvent_ipAddress_createdAt_idx" ON "AuthAuditEvent"("ipAddress", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LlmMemory_contextType_key" ON "LlmMemory"("contextType");

-- CreateIndex
CREATE INDEX "MemorySummary_summaryType_updatedAt_idx" ON "MemorySummary"("summaryType", "updatedAt");

-- CreateIndex
CREATE INDEX "MemorySummary_subjectKey_updatedAt_idx" ON "MemorySummary"("subjectKey", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GamificationState_userId_key" ON "GamificationState"("userId");

-- CreateIndex
CREATE INDEX "GamificationEvent_userId_createdAt_idx" ON "GamificationEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GamificationEvent_eventType_createdAt_idx" ON "GamificationEvent"("eventType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GamificationEvent_assignmentId_eventType_key" ON "GamificationEvent"("assignmentId", "eventType");

-- AddForeignKey
ALTER TABLE "Chore" ADD CONSTRAINT "Chore_defaultAssigneeId_fkey" FOREIGN KEY ("defaultAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreAssignment" ADD CONSTRAINT "ChoreAssignment_choreId_fkey" FOREIGN KEY ("choreId") REFERENCES "Chore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreAssignment" ADD CONSTRAINT "ChoreAssignment_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreHistory" ADD CONSTRAINT "ChoreHistory_choreId_fkey" FOREIGN KEY ("choreId") REFERENCES "Chore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreHistory" ADD CONSTRAINT "ChoreHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentEvent" ADD CONSTRAINT "AssignmentEvent_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ChoreAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentEvent" ADD CONSTRAINT "AssignmentEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialSituation" ADD CONSTRAINT "SpecialSituation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SituationItem" ADD CONSTRAINT "SituationItem_situationId_fkey" FOREIGN KEY ("situationId") REFERENCES "SpecialSituation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SituationItem" ADD CONSTRAINT "SituationItem_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiFeedbackEvent" ADD CONSTRAINT "AiFeedbackEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthAuditEvent" ADD CONSTRAINT "AuthAuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamificationState" ADD CONSTRAINT "GamificationState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamificationEvent" ADD CONSTRAINT "GamificationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
