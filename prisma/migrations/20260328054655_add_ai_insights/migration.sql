-- CreateTable
CREATE TABLE "player_presets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerIds" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "player_presets_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ai_insights" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "matchId" TEXT,
    "playerId" TEXT,
    "teamId" TEXT NOT NULL,
    "metricKey" TEXT,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "tokensUsed" INTEGER,
    "costEstimate" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_insights_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ai_insights_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ai_insights_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_matches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "opponent" TEXT NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "tournament" TEXT,
    "location" TEXT,
    "date" DATETIME NOT NULL,
    "result" TEXT NOT NULL,
    "finalScore" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "sets" TEXT NOT NULL,
    "stats" TEXT,
    "duration" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "matches_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_matches" ("awayTeam", "createdAt", "date", "duration", "finalScore", "homeTeam", "id", "location", "opponent", "result", "sets", "stats", "teamId", "tournament", "updatedAt") SELECT "awayTeam", "createdAt", "date", "duration", "finalScore", "homeTeam", "id", "location", "opponent", "result", "sets", "stats", "teamId", "tournament", "updatedAt" FROM "matches";
DROP TABLE "matches";
ALTER TABLE "new_matches" RENAME TO "matches";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "player_presets_teamId_name_key" ON "player_presets"("teamId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ai_insights_type_matchId_playerId_teamId_metricKey_key" ON "ai_insights"("type", "matchId", "playerId", "teamId", "metricKey");
