CREATE TYPE "StripeWebhookEventStatus" AS ENUM ('processing', 'processed', 'failed');

ALTER TABLE "StripeWebhookEvent"
ADD COLUMN "status" "StripeWebhookEventStatus" NOT NULL DEFAULT 'processed',
ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "lastError" TEXT,
ADD COLUMN "processingStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "StripeWebhookEvent"
SET
  "processingStartedAt" = "processedAt",
  "createdAt" = "processedAt",
  "updatedAt" = "processedAt"
WHERE "processedAt" IS NOT NULL;

ALTER TABLE "StripeWebhookEvent"
ALTER COLUMN "processedAt" DROP DEFAULT,
ALTER COLUMN "processedAt" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'processing';

CREATE INDEX "StripeWebhookEvent_status_processingStartedAt_idx"
ON "StripeWebhookEvent"("status", "processingStartedAt");
