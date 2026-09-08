-- CreateTable
CREATE TABLE "PlannedDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    CONSTRAINT "PlannedDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlannedDayItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plannedDayId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    CONSTRAINT "PlannedDayItem_plannedDayId_fkey" FOREIGN KEY ("plannedDayId") REFERENCES "PlannedDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlannedDayItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PlannedDay_userId_idx" ON "PlannedDay"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlannedDay_userId_date_key" ON "PlannedDay"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PlannedDayItem_plannedDayId_itemId_key" ON "PlannedDayItem"("plannedDayId", "itemId");
