-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subtype" TEXT NOT NULL,
    "color" TEXT,
    "imagePath" TEXT,
    "sourceUrl" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Pairing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemAId" TEXT NOT NULL,
    "itemBId" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    CONSTRAINT "Pairing_itemAId_fkey" FOREIGN KEY ("itemAId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pairing_itemBId_fkey" FOREIGN KEY ("itemBId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Pairing_itemAId_itemBId_key" ON "Pairing"("itemAId", "itemBId");
