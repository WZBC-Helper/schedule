import { drizzle } from 'drizzle-orm/mysql2'
import mysql, { type Pool } from 'mysql2/promise'

function requireDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required')
  }

  let parsed: URL
  try {
    parsed = new URL(databaseUrl)
  }
  catch {
    throw new Error('DATABASE_URL must be a valid MySQL connection URL')
  }

  if (parsed.protocol !== 'mysql:') {
    throw new Error('DATABASE_URL must use the mysql:// protocol')
  }

  return databaseUrl
}

const globalDatabase = globalThis as typeof globalThis & {
  __wzbcScheduleMySqlPool?: Pool
}

export const pool = globalDatabase.__wzbcScheduleMySqlPool
  ?? mysql.createPool(requireDatabaseUrl())

if (process.env.NODE_ENV !== 'production') {
  globalDatabase.__wzbcScheduleMySqlPool = pool
}

export const db = drizzle({ client: pool })
