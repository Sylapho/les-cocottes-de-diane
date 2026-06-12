ALTER TYPE "StripeCheckoutReconciliationOperation"
ADD VALUE IF NOT EXISTS 'review_unmatched_checkout_session';

ALTER TYPE "StripeCheckoutReconciliationStatus"
ADD VALUE IF NOT EXISTS 'manual_review';

CREATE TYPE "StripeCheckoutReconciliationAttemptOrigin" AS ENUM (
    'automatic',
    'manual'
);

CREATE TYPE "StripeCheckoutReconciliationAttemptResult" AS ENUM (
    'resolved',
    'retry_scheduled',
    'failed',
    'manual_review',
    'skipped'
);

ALTER TABLE "StripeCheckoutReconciliation"
DROP CONSTRAINT "StripeCheckoutReconciliation_commandeId_fkey";

ALTER TABLE "StripeCheckoutReconciliation"
ALTER COLUMN "commandeId" DROP NOT NULL,
ADD COLUMN "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "claimedAt" TIMESTAMP(3),
ADD COLUMN "claimedBy" TEXT,
ADD COLUMN "leaseExpiresAt" TIMESTAMP(3),
ADD COLUMN "failedAt" TIMESTAMP(3),
ADD COLUMN "manualReviewReason" TEXT,
ADD COLUMN "manualResolution" TEXT,
ADD COLUMN "manualResolvedByUserId" TEXT,
ADD COLUMN "metadata" JSONB;

ALTER TABLE "StripeCheckoutReconciliation"
ADD CONSTRAINT "StripeCheckoutReconciliation_commandeId_fkey"
FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "StripeCheckoutReconciliation_status_nextAttemptAt_idx"
ON "StripeCheckoutReconciliation"("status", "nextAttemptAt");

CREATE INDEX "StripeCheckoutReconciliation_claimedBy_leaseExpiresAt_idx"
ON "StripeCheckoutReconciliation"("claimedBy", "leaseExpiresAt");

CREATE TABLE "StripeCheckoutReconciliationAttempt" (
    "id" SERIAL NOT NULL,
    "reconciliationId" INTEGER NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "origin" "StripeCheckoutReconciliationAttemptOrigin" NOT NULL,
    "action" TEXT NOT NULL,
    "stripeState" TEXT,
    "localState" TEXT,
    "result" "StripeCheckoutReconciliationAttemptResult",
    "error" TEXT,
    "workerId" TEXT,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "StripeCheckoutReconciliationAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StripeCheckoutReconciliationAttempt_reconciliationId_startedAt_idx"
ON "StripeCheckoutReconciliationAttempt"("reconciliationId", "startedAt");

CREATE INDEX "StripeCheckoutReconciliationAttempt_origin_startedAt_idx"
ON "StripeCheckoutReconciliationAttempt"("origin", "startedAt");

ALTER TABLE "StripeCheckoutReconciliationAttempt"
ADD CONSTRAINT "StripeCheckoutReconciliationAttempt_reconciliationId_fkey"
FOREIGN KEY ("reconciliationId") REFERENCES "StripeCheckoutReconciliation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
