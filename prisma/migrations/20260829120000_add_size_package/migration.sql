-- CreateTable
CREATE TABLE "SizePackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SizePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SizeToSizePackage" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SizeToSizePackage_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "SizePackage_name_key" ON "SizePackage"("name");

-- CreateIndex
CREATE INDEX "_SizeToSizePackage_B_index" ON "_SizeToSizePackage"("B");

-- AddForeignKey
ALTER TABLE "_SizeToSizePackage" ADD CONSTRAINT "_SizeToSizePackage_A_fkey" FOREIGN KEY ("A") REFERENCES "Size"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SizeToSizePackage" ADD CONSTRAINT "_SizeToSizePackage_B_fkey" FOREIGN KEY ("B") REFERENCES "SizePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
