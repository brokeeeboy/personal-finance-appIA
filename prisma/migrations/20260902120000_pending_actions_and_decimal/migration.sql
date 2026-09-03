-- Persist conversational drafts and use exact numeric storage for money.
CREATE TYPE "PendingActionType" AS ENUM ('DEBT', 'TRANSACTION');

CREATE TABLE "PendingAction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PendingActionType" NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PendingAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PendingAction_userId_type_idx" ON "PendingAction"("userId", "type");
CREATE INDEX "PendingAction_expiresAt_idx" ON "PendingAction"("expiresAt");
ALTER TABLE "PendingAction" ADD CONSTRAINT "PendingAction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Account" ALTER COLUMN "creditLimit" TYPE DECIMAL(18,2)
  USING "creditLimit"::numeric;
ALTER TABLE "Account" ALTER COLUMN "balance" TYPE DECIMAL(18,2)
  USING "balance"::numeric;
ALTER TABLE "Transaction" ALTER COLUMN "amount" TYPE DECIMAL(18,2)
  USING "amount"::numeric;
ALTER TABLE "Transaction" ALTER COLUMN "confidenceLevel" TYPE DECIMAL(5,4)
  USING "confidenceLevel"::numeric;
ALTER TABLE "Debt" ALTER COLUMN "amount" TYPE DECIMAL(18,2)
  USING "amount"::numeric;
ALTER TABLE "Goal" ALTER COLUMN "targetAmount" TYPE DECIMAL(18,2)
  USING "targetAmount"::numeric;
ALTER TABLE "Goal" ALTER COLUMN "currentAmount" TYPE DECIMAL(18,2)
  USING "currentAmount"::numeric;
ALTER TABLE "GoalContribution" ALTER COLUMN "amount" TYPE DECIMAL(18,2)
  USING "amount"::numeric;
