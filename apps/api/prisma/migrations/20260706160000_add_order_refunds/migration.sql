CREATE TYPE "RefundStatus" AS ENUM (
    'pending',
    'requires_action',
    'succeeded',
    'failed',
    'canceled'
);

ALTER TABLE "Commande"
ADD COLUMN "stripePaymentIntentId" TEXT;

CREATE TABLE "Refund" (
    "id" SERIAL NOT NULL,
    "commandeId" INTEGER NOT NULL,
    "stripeRefundId" TEXT,
    "stripePaymentIntentId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "reason" TEXT NOT NULL,
    "internalNote" TEXT,
    "status" "RefundStatus" NOT NULL DEFAULT 'pending',
    "requestedByUserId" TEXT,
    "stripeRawStatus" TEXT,
    "failureReason" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Refund_amountCents_positive" CHECK ("amountCents" > 0)
);

CREATE UNIQUE INDEX "Refund_stripeRefundId_key" ON "Refund"("stripeRefundId");
CREATE UNIQUE INDEX "Refund_idempotencyKey_key" ON "Refund"("idempotencyKey");
CREATE INDEX "Commande_stripePaymentIntentId_idx" ON "Commande"("stripePaymentIntentId");
CREATE INDEX "Refund_commandeId_idx" ON "Refund"("commandeId");
CREATE INDEX "Refund_commandeId_status_idx" ON "Refund"("commandeId", "status");
CREATE INDEX "Refund_stripePaymentIntentId_idx" ON "Refund"("stripePaymentIntentId");
CREATE INDEX "Refund_status_idx" ON "Refund"("status");

ALTER TABLE "Refund"
ADD CONSTRAINT "Refund_commandeId_fkey"
FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE CASCADE ON UPDATE CASCADE;
