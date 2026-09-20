import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { db } from '../database/client'
import * as authSchema from '../database/schema/auth'

function requireEnvironmentVariable(name: 'BETTER_AUTH_SECRET' | 'BETTER_AUTH_URL'): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

const baseURL = requireEnvironmentVariable('BETTER_AUTH_URL')
const secret = requireEnvironmentVariable('BETTER_AUTH_SECRET')

let trustedOrigin: string
try {
  trustedOrigin = new URL(baseURL).origin
}
catch {
  throw new Error('BETTER_AUTH_URL must be a valid absolute URL')
}

export const auth = betterAuth({
  appName: '拾光课表',
  baseURL,
  secret,
  trustedOrigins: [trustedOrigin],
  database: drizzleAdapter(db, {
    provider: 'mysql',
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    requireEmailVerification: false,
    revokeSessionsOnPasswordReset: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: false,
    },
  },
  rateLimit: {
    enabled: true,
    storage: 'database',
    window: 60,
    max: 100,
  },
  advanced: {
    ipAddress: {
      // The Nuxt handler replaces this header with the direct socket address,
      // so client-supplied forwarding headers cannot bypass rate limiting.
      ipAddressHeaders: ['x-wzbc-client-ip'],
    },
  },
})
