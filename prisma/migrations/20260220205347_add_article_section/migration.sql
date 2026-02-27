-- AlterTable
ALTER TABLE "Article" ADD COLUMN "section" TEXT;

-- CreateIndex
CREATE INDEX "Article_section_idx" ON "Article"("section");
