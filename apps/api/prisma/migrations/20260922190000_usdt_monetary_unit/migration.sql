ALTER TABLE "Currency" ALTER COLUMN "code" TYPE VARCHAR(4);
ALTER TABLE "UserPreferences" ALTER COLUMN "baseCurrency" TYPE VARCHAR(4);
ALTER TABLE "Account" ALTER COLUMN "currencyCode" TYPE VARCHAR(4);
ALTER TABLE "Transaction" ALTER COLUMN "currencyCode" TYPE VARCHAR(4);
ALTER TABLE "Transfer"
  ALTER COLUMN "sourceCurrency" TYPE VARCHAR(4),
  ALTER COLUMN "destinationCurrency" TYPE VARCHAR(4);
ALTER TABLE "FxRate"
  ALTER COLUMN "baseCode" TYPE VARCHAR(4),
  ALTER COLUMN "quoteCode" TYPE VARCHAR(4);
ALTER TABLE "FxSnapshotRate"
  ALTER COLUMN "baseCode" TYPE VARCHAR(4),
  ALTER COLUMN "quoteCode" TYPE VARCHAR(4);
ALTER TABLE "Budget" ALTER COLUMN "currencyCode" TYPE VARCHAR(4);
ALTER TABLE "RecurringRule" ALTER COLUMN "currencyCode" TYPE VARCHAR(4);
ALTER TABLE "TransactionFxSnapshot"
  ALTER COLUMN "sourceCurrency" TYPE VARCHAR(4),
  ALTER COLUMN "baseCurrency" TYPE VARCHAR(4);

ALTER TABLE "Currency" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT TRUE;

INSERT INTO "Currency" ("code", "precision", "active")
VALUES ('USDT', 6, TRUE)
ON CONFLICT ("code") DO UPDATE
SET "precision" = EXCLUDED."precision", "active" = EXCLUDED."active";
