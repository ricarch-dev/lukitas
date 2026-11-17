-- Additive migration: existing money, transactions and accounts are not rewritten.
CREATE TABLE "Debt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "direction" TEXT NOT NULL CHECK ("direction" IN ('PAYABLE', 'RECEIVABLE')),
    "counterparty" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "principal" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "dueDate" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Debt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Debt_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "DebtEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "debtId" TEXT NOT NULL,
    "kind" TEXT NOT NULL CHECK ("kind" IN ('ORIGINATION', 'PAYMENT')),
    "debtAmount" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "accountId" TEXT,
    "cashAmount" TEXT,
    "cashCurrencyCode" TEXT,
    "rate" TEXT,
    "transactionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DebtEvent_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DebtEvent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DebtEvent_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Debt_userId_createdAt_idx" ON "Debt"("userId", "createdAt");
CREATE INDEX "DebtEvent_debtId_occurredAt_idx" ON "DebtEvent"("debtId", "occurredAt");
CREATE UNIQUE INDEX "DebtEvent_transactionId_key" ON "DebtEvent"("transactionId");
