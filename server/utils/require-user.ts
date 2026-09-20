import type { H3Event } from 'h3'
import { createError } from 'h3'
import { auth } from './auth'
import { getTrustedAuthHeaders } from './auth-headers'

export async function getAuthSession(event: H3Event) {
  return auth.api.getSession({ headers: getTrustedAuthHeaders(event) })
}

export async function requireSession(event: H3Event) {
  const session = await getAuthSession(event)
  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: '请先登录',
    })
  }
  return session
}

export async function requireUser(event: H3Event) {
  return (await requireSession(event)).user
}
