-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_scout_actions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT,
    "time" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "subAction" TEXT NOT NULL,
    "zone" INTEGER NOT NULL,
    "coordinateX" REAL NOT NULL,
    "coordinateY" REAL NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "videoTimestamp" TEXT,
    "efficiencyValue" REAL,
    "phase" TEXT,
    "rallyId" TEXT,
    "fullData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scout_actions_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "scout_actions_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_scout_actions" ("action", "coordinateX", "coordinateY", "createdAt", "efficiencyValue", "fullData", "id", "matchId", "phase", "playerId", "rallyId", "setNumber", "subAction", "time", "timestamp", "videoTimestamp", "zone") SELECT "action", "coordinateX", "coordinateY", "createdAt", "efficiencyValue", "fullData", "id", "matchId", "phase", "playerId", "rallyId", "setNumber", "subAction", "time", "timestamp", "videoTimestamp", "zone" FROM "scout_actions";
DROP TABLE "scout_actions";
ALTER TABLE "new_scout_actions" RENAME TO "scout_actions";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
