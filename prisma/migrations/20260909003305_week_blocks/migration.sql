-- CreateTable
CREATE TABLE "PlannedWeekBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "week" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT,
    CONSTRAINT "PlannedWeekBlock_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlannedWeekBlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PlannedWeekBlock_userId_idx" ON "PlannedWeekBlock"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlannedWeekBlock_userId_week_itemId_key" ON "PlannedWeekBlock"("userId", "week", "itemId");
