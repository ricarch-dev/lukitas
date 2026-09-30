CREATE TABLE "BankGroup" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    CONSTRAINT "BankGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BankGroup_userId_normalizedName_key" ON "BankGroup"("userId", "normalizedName");
CREATE UNIQUE INDEX "BankGroup_id_userId_key" ON "BankGroup"("id", "userId");
ALTER TABLE "BankGroup" ADD CONSTRAINT "BankGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Account" ADD COLUMN "bankGroupId" UUID;
ALTER TABLE "Account" ADD CONSTRAINT "Account_bankGroupId_userId_fkey" FOREIGN KEY ("bankGroupId", "userId") REFERENCES "BankGroup"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
