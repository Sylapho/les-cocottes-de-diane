-- DropForeignKey
ALTER TABLE "Vente" DROP CONSTRAINT "Vente_userId_fkey";

-- AlterTable
ALTER TABLE "Vente" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Vente" ADD CONSTRAINT "Vente_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
