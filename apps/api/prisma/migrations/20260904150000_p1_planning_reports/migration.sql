CREATE TYPE "RecurrenceCadence" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

ALTER TABLE "Transaction" ADD COLUMN "categoryId" UUID;
CREATE INDEX "Transaction_userId_categoryId_occurredAt_idx" ON "Transaction"("userId", "categoryId", "occurredAt");

CREATE TABLE "Category" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "archivedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Category_userId_normalizedName_key" ON "Category"("userId", "normalizedName");
CREATE INDEX "Category_userId_archivedAt_idx" ON "Category"("userId", "archivedAt");

CREATE TABLE "Budget" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "categoryId" UUID NOT NULL,
  "monthKey" VARCHAR(7) NOT NULL,
  "timezone" TEXT NOT NULL,
  "currencyCode" VARCHAR(3) NOT NULL,
  "limit" DECIMAL(20,8) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Budget_userId_categoryId_monthKey_key" ON "Budget"("userId", "categoryId", "monthKey");
CREATE INDEX "Budget_userId_monthKey_idx" ON "Budget"("userId", "monthKey");

CREATE TABLE "RecurringRule" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "accountId" UUID NOT NULL,
  "categoryId" UUID,
  "kind" "TransactionKind" NOT NULL,
  "amount" DECIMAL(20,8) NOT NULL,
  "currencyCode" VARCHAR(3) NOT NULL,
  "note" TEXT,
  "cadence" "RecurrenceCadence" NOT NULL,
  "timezone" TEXT NOT NULL,
  "startAt" TIMESTAMPTZ(3) NOT NULL,
  "endAt" TIMESTAMPTZ(3),
  "nextOccurrence" TIMESTAMPTZ(3) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "RecurringRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RecurringRule_userId_active_nextOccurrence_idx" ON "RecurringRule"("userId", "active", "nextOccurrence");

CREATE TABLE "RecurringOccurrence" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ruleId" UUID NOT NULL,
  "occurrenceAt" TIMESTAMPTZ(3) NOT NULL,
  "transactionId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecurringOccurrence_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RecurringOccurrence_transactionId_key" ON "RecurringOccurrence"("transactionId");
CREATE UNIQUE INDEX "RecurringOccurrence_ruleId_occurrenceAt_key" ON "RecurringOccurrence"("ruleId", "occurrenceAt");
CREATE INDEX "RecurringOccurrence_ruleId_occurrenceAt_idx" ON "RecurringOccurrence"("ruleId", "occurrenceAt");

CREATE TABLE "TransactionFxSnapshot" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "transactionId" UUID NOT NULL,
  "sourceCurrency" VARCHAR(3) NOT NULL,
  "baseCurrency" VARCHAR(3) NOT NULL,
  "sourceAmount" DECIMAL(20,8) NOT NULL,
  "baseAmount" DECIMAL(20,8) NOT NULL,
  "rate" DECIMAL(24,12) NOT NULL,
  "effectiveAt" TIMESTAMPTZ(3) NOT NULL,
  "source" "FxSource" NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TransactionFxSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TransactionFxSnapshot_transactionId_key" ON "TransactionFxSnapshot"("transactionId");
CREATE INDEX "TransactionFxSnapshot_baseCurrency_effectiveAt_idx" ON "TransactionFxSnapshot"("baseCurrency", "effectiveAt");

ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecurringOccurrence" ADD CONSTRAINT "RecurringOccurrence_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "RecurringRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringOccurrence" ADD CONSTRAINT "RecurringOccurrence_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransactionFxSnapshot" ADD CONSTRAINT "TransactionFxSnapshot_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
