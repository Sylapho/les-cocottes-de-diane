-- CreateTable
CREATE TABLE "MouvementStock" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "cible" TEXT NOT NULL,
    "articleId" INTEGER,
    "mpId" INTEGER,
    "quantite" DOUBLE PRECISION NOT NULL,
    "stockAvant" DOUBLE PRECISION NOT NULL,
    "stockApres" DOUBLE PRECISION NOT NULL,
    "motif" TEXT,
    "reference" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MouvementStock_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MouvementStock" ADD CONSTRAINT "MouvementStock_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MouvementStock" ADD CONSTRAINT "MouvementStock_mpId_fkey" FOREIGN KEY ("mpId") REFERENCES "MatierePremiere"("id") ON DELETE SET NULL ON UPDATE CASCADE;
