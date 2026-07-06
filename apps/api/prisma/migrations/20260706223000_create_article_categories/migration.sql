ALTER TYPE "ArticleCategory" RENAME TO "ArticleCategoryLegacy";

CREATE TABLE "ArticleCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArticleCategory_slug_key" ON "ArticleCategory"("slug");
CREATE INDEX "ArticleCategory_isActive_sortOrder_idx" ON "ArticleCategory"("isActive", "sortOrder");

INSERT INTO "ArticleCategory" ("name", "slug", "description", "sortOrder")
VALUES
    ('Bocaux', 'bocaux', 'Terrines, rillettes, mousses et préparations en pot.', 10),
    ('Découpes', 'decoupes', 'Découpes fraîches de volaille.', 20),
    ('Préparations', 'preparations', 'Préparations bouchères et produits panés.', 30),
    ('Brochettes', 'brochettes', 'Brochettes et pièces marinées.', 40),
    ('Oeufs', 'oeufs', 'Oeufs et plateaux.', 50),
    ('Packs', 'packs', 'Assortiments et packs familiaux.', 60),
    ('Autres', 'autres', 'Articles sans catégorie dédiée.', 999);

ALTER TABLE "Article" ADD COLUMN "categoryId" INTEGER;

UPDATE "Article"
SET "categoryId" = "ArticleCategory"."id"
FROM "ArticleCategory"
WHERE "Article"."category"::text = CASE "ArticleCategory"."slug"
    WHEN 'bocaux' THEN 'JARS'
    WHEN 'decoupes' THEN 'CUTS'
    WHEN 'preparations' THEN 'PREPARATIONS'
    WHEN 'brochettes' THEN 'SKEWERS'
    WHEN 'oeufs' THEN 'EGGS'
    WHEN 'packs' THEN 'PACKS'
    WHEN 'autres' THEN 'OTHER'
END;

UPDATE "Article"
SET "categoryId" = (SELECT "id" FROM "ArticleCategory" WHERE "slug" = 'autres')
WHERE "categoryId" IS NULL;

DROP INDEX IF EXISTS "Article_category_idx";
ALTER TABLE "Article" DROP COLUMN "category";
DROP TYPE "ArticleCategoryLegacy";

CREATE INDEX "Article_categoryId_idx" ON "Article"("categoryId");

ALTER TABLE "Article"
ADD CONSTRAINT "Article_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "ArticleCategory"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
