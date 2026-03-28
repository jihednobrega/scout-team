-- CreateTable
CREATE TABLE "game_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "time" TEXT NOT NULL,
    "opponentId" TEXT,
    "opponentName" TEXT NOT NULL,
    "tournament" TEXT,
    "location" TEXT,
    "matchType" TEXT NOT NULL,
    "lineup" TEXT NOT NULL,
    "liberoId" TEXT NOT NULL,
    "rotationStart" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "customWeights" TEXT,
    "advanced" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "opponents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "logo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "scout_models" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fundamentals" TEXT NOT NULL,
    "customWeights" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "game_configs_gameId_key" ON "game_configs"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "opponents_name_key" ON "opponents"("name");

-- CreateIndex
CREATE UNIQUE INDEX "scout_models_name_key" ON "scout_models"("name");
