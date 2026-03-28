/*
  Warnings:

  - You are about to drop the column `dominantArm` on the `players` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "scout_actions" ADD COLUMN "videoTimestamp" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_players" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "jerseyNumber" INTEGER NOT NULL,
    "position" TEXT NOT NULL,
    "secondaryPositions" TEXT NOT NULL DEFAULT '[]',
    "photo" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "players_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_players" ("createdAt", "id", "jerseyNumber", "name", "photo", "position", "teamId", "updatedAt") SELECT "createdAt", "id", "jerseyNumber", "name", "photo", "position", "teamId", "updatedAt" FROM "players";
DROP TABLE "players";
ALTER TABLE "new_players" RENAME TO "players";
CREATE UNIQUE INDEX "players_teamId_jerseyNumber_key" ON "players"("teamId", "jerseyNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
