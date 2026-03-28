// lib/prisma.ts
import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  // Em produção (Vercel): usa Turso via libsql adapter
  // Em desenvolvimento: sempre usa SQLite local (dev.db)
  if (process.env.NODE_ENV === 'production' && process.env.TURSO_DATABASE_URL) {
    const adapter = new PrismaLibSql({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN ?? undefined,
    })
    return new PrismaClient({ adapter })
  }

  return new PrismaClient()
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
