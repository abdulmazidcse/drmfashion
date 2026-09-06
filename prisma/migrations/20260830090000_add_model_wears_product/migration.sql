-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "modelWearsProductId" TEXT;

-- CreateIndex
CREATE INDEX "Product_modelWearsProductId_idx" ON "Product"("modelWearsProductId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_modelWearsProductId_fkey" FOREIGN KEY ("modelWearsProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
