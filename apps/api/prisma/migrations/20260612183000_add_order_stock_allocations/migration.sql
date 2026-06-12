ALTER TABLE "LigneCommande"
ADD COLUMN "quantitePrecommande" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "LigneCommande"
ADD CONSTRAINT "LigneCommande_quantite_precommande_check"
CHECK ("quantitePrecommande" >= 0 AND "quantitePrecommande" <= "quantite");

ALTER TABLE "LigneCommande"
ADD CONSTRAINT "LigneCommande_id_commandeId_key"
UNIQUE ("id", "commandeId");

CREATE INDEX "LigneCommande_commandeId_idx"
ON "LigneCommande"("commandeId");

CREATE INDEX "LigneCommande_articleId_idx"
ON "LigneCommande"("articleId");

CREATE TABLE "CommandeStockAllocation" (
    "id" SERIAL NOT NULL,
    "commandeId" INTEGER NOT NULL,
    "ligneCommandeId" INTEGER NOT NULL,
    "stockLotId" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "restoredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommandeStockAllocation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CommandeStockAllocation_quantity_positive_check" CHECK ("quantity" > 0)
);

CREATE INDEX "CommandeStockAllocation_commandeId_idx"
ON "CommandeStockAllocation"("commandeId");

CREATE INDEX "CommandeStockAllocation_ligneCommandeId_idx"
ON "CommandeStockAllocation"("ligneCommandeId");

CREATE INDEX "CommandeStockAllocation_stockLotId_idx"
ON "CommandeStockAllocation"("stockLotId");

CREATE INDEX "CommandeStockAllocation_commandeId_restoredAt_idx"
ON "CommandeStockAllocation"("commandeId", "restoredAt");

CREATE UNIQUE INDEX "CommandeStockAllocation_ligneCommandeId_stockLotId_key"
ON "CommandeStockAllocation"("ligneCommandeId", "stockLotId");

ALTER TABLE "CommandeStockAllocation"
ADD CONSTRAINT "CommandeStockAllocation_commandeId_fkey"
FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommandeStockAllocation"
ADD CONSTRAINT "CommandeStockAllocation_ligneCommandeId_commandeId_fkey"
FOREIGN KEY ("ligneCommandeId", "commandeId") REFERENCES "LigneCommande"("id", "commandeId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommandeStockAllocation"
ADD CONSTRAINT "CommandeStockAllocation_stockLotId_fkey"
FOREIGN KEY ("stockLotId") REFERENCES "StockLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
