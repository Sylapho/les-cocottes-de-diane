ALTER TABLE "Article" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "Article_online_archivedAt_idx" ON "Article"("online", "archivedAt");
CREATE INDEX "Article_archivedAt_idx" ON "Article"("archivedAt");

ALTER TABLE "MouvementStock" DROP CONSTRAINT "MouvementStock_articleId_fkey";
ALTER TABLE "MouvementStock" ADD CONSTRAINT "MouvementStock_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;
