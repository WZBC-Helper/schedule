import type { H3Event } from 'h3'
import { createError, getHeader, readRawBody } from 'h3'

const MAX_JSON_BODY_BYTES = 5 * 1024 * 1024

export async function readLimitedJsonBody(event: H3Event): Promise<unknown> {
  const contentLength = Number(getHeader(event, 'content-length') || 0)
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BODY_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Payload Too Large', message: '请求内容不能超过 5 MB' })
  }

  const rawBody = await readRawBody(event, 'utf8')
  if (!rawBody) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: '请求内容不能为空' })
  }
  if (new TextEncoder().encode(rawBody).byteLength > MAX_JSON_BODY_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Payload Too Large', message: '请求内容不能超过 5 MB' })
  }

  try {
    return JSON.parse(rawBody) as unknown
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: '请求内容不是有效的 JSON' })
  }
}
