CREATE TABLE "StockLot" (
    "id" SERIAL NOT NULL,
    "target" TEXT NOT NULL,
    "articleId" INTEGER,
    "mpId" INTEGER,
    "initialQuantity" DOUBLE PRECISION NOT NULL,
    "remainingQuantity" DOUBLE PRECISION NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockLot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StockLot_target_check" CHECK ("target" IN ('article', 'matiere_premiere')),
    CONSTRAINT "StockLot_target_relation_check" CHECK (
        ("target" = 'article' AND "articleId" IS NOT NULL AND "mpId" IS NULL)
        OR ("target" = 'matiere_premiere' AND "mpId" IS NOT NULL AND "articleId" IS NULL)
    ),
    CONSTRAINT "StockLot_quantities_check" CHECK ("initialQuantity" >= 0 AND "remainingQuantity" >= 0)
);

CREATE INDEX "StockLot_target_expiresAt_idx" ON "StockLot"("target", "expiresAt");
CREATE INDEX "StockLot_articleId_idx" ON "StockLot"("articleId");
CREATE INDEX "StockLot_mpId_idx" ON "StockLot"("mpId");

ALTER TABLE "StockLot" ADD CONSTRAINT "StockLot_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockLot" ADD CONSTRAINT "StockLot_mpId_fkey" FOREIGN KEY ("mpId") REFERENCES "MatierePremiere"("id") ON DELETE SET NULL ON UPDATE CASCADE;
