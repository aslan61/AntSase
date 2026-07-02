-- CreateTable
CREATE TABLE "Upload" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "filename" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "totalRows" INTEGER NOT NULL,
  "validCount" INTEGER NOT NULL,
  "warningCount" INTEGER NOT NULL,
  "unplacedCount" INTEGER NOT NULL
);
CREATE TABLE "Vehicle" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "uploadId" TEXT NOT NULL,
  "saseNo" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "rowIndex" INTEGER NOT NULL,
  "valid" BOOLEAN NOT NULL,
  CONSTRAINT "Vehicle_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "Placement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "uploadId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "sahaId" TEXT NOT NULL,
  "blockId" TEXT NOT NULL,
  "slotIndex" INTEGER NOT NULL,
  "col" INTEGER NOT NULL,
  "row" INTEGER NOT NULL,
  CONSTRAINT "Placement_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Placement_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "Snapshot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "uploadId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "dataJson" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Snapshot_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Vehicle_uploadId_rowIndex_idx" ON "Vehicle"("uploadId", "rowIndex");
CREATE INDEX "Vehicle_uploadId_saseNo_idx" ON "Vehicle"("uploadId", "saseNo");
CREATE UNIQUE INDEX "Placement_vehicleId_key" ON "Placement"("vehicleId");
CREATE UNIQUE INDEX "Placement_uploadId_blockId_slotIndex_key" ON "Placement"("uploadId", "blockId", "slotIndex");
CREATE INDEX "Placement_uploadId_sahaId_blockId_idx" ON "Placement"("uploadId", "sahaId", "blockId");
CREATE INDEX "Snapshot_uploadId_createdAt_idx" ON "Snapshot"("uploadId", "createdAt");
