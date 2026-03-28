import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // @ts-expect-error -- seed is valid in Prisma config but types lag behind
  seed: "npx tsx prisma/seed.ts",
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
