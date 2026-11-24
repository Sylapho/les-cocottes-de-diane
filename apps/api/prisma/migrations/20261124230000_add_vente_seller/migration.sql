-- Sales are attributed to the authenticated Better Auth account ("user" table).
-- Additive and nullable: existing sales keep sellerId = NULL (seller unknown).
ALTER TABLE "Vente" ADD COLUMN "sellerId" TEXT;

CREATE INDEX "Vente_sellerId_idx" ON "Vente"("sellerId");

ALTER TABLE "Vente"
  ADD CONSTRAINT "Vente_sellerId_fkey"
  FOREIGN KEY ("sellerId") REFERENCES "user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
