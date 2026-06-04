CREATE TABLE "StripeWebhookEvent" (
    "id" SERIAL NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StripeWebhookEvent_eventId_key" ON "StripeWebhookEvent"("eventId");

CREATE INDEX "Commande_statut_idx" ON "Commande"("statut");
CREATE INDEX "Commande_stripeId_idx" ON "Commande"("stripeId");
CREATE INDEX "Commande_dateRetrait_idx" ON "Commande"("dateRetrait");
CREATE INDEX "Article_online_idx" ON "Article"("online");
