import { createError, getRouterParam } from 'h3'
import { deleteSessionForUser } from '../../../../repositories/schedule'
import { readLimitedJsonBody } from '../../../../utils/read-json-body'
import { requireUser } from '../../../../utils/require-user'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const courseId = getRouterParam(event, 'courseId')
  const sessionId = getRouterParam(event, 'sessionId')
  if (!courseId || !sessionId) throw createError({ statusCode: 404, message: '课程时段不存在' })
  return deleteSessionForUser(user.id, courseId, sessionId, await readLimitedJsonBody(event))
})
