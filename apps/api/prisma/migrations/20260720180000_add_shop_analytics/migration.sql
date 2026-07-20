-- Add a stable business timestamp and anonymous attribution to orders.
ALTER TABLE "Commande"
ADD COLUMN "confirmedAt" TIMESTAMP(3),
ADD COLUMN "analyticsVisitorId" TEXT,
ADD COLUMN "analyticsSessionId" TEXT;

-- Existing orders that already reached an eligible status are backfilled with
-- their creation timestamp, the only stable historical timestamp available.
UPDATE "Commande"
SET "confirmedAt" = "createdAt"
WHERE "statut" IN ('nouvelle', 'preparee', 'traitee');

CREATE TABLE "AnalyticsVisitor" (
  "id" TEXT NOT NULL,
  "visitorHash" TEXT NOT NULL,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AnalyticsVisitor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalyticsSession" (
  "id" TEXT NOT NULL,
  "sessionHash" TEXT NOT NULL,
  "visitorId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "convertedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AnalyticsSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnalyticsVisitor_visitorHash_key" ON "AnalyticsVisitor"("visitorHash");
CREATE INDEX "AnalyticsVisitor_firstSeenAt_idx" ON "AnalyticsVisitor"("firstSeenAt");
CREATE INDEX "AnalyticsVisitor_lastSeenAt_idx" ON "AnalyticsVisitor"("lastSeenAt");
CREATE UNIQUE INDEX "AnalyticsSession_sessionHash_key" ON "AnalyticsSession"("sessionHash");
CREATE INDEX "AnalyticsSession_startedAt_idx" ON "AnalyticsSession"("startedAt");
CREATE INDEX "AnalyticsSession_visitorId_startedAt_idx" ON "AnalyticsSession"("visitorId", "startedAt");
CREATE INDEX "AnalyticsSession_visitorId_lastActivityAt_idx" ON "AnalyticsSession"("visitorId", "lastActivityAt");
CREATE INDEX "Commande_confirmedAt_idx" ON "Commande"("confirmedAt");
CREATE INDEX "Commande_analyticsVisitorId_confirmedAt_idx" ON "Commande"("analyticsVisitorId", "confirmedAt");
CREATE INDEX "Commande_analyticsSessionId_idx" ON "Commande"("analyticsSessionId");

ALTER TABLE "AnalyticsSession"
ADD CONSTRAINT "AnalyticsSession_visitorId_fkey"
FOREIGN KEY ("visitorId") REFERENCES "AnalyticsVisitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Commande"
ADD CONSTRAINT "Commande_analyticsVisitorId_fkey"
FOREIGN KEY ("analyticsVisitorId") REFERENCES "AnalyticsVisitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Commande"
ADD CONSTRAINT "Commande_analyticsSessionId_fkey"
FOREIGN KEY ("analyticsSessionId") REFERENCES "AnalyticsSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
