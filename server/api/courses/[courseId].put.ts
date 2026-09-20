import { createError, getRouterParam } from 'h3'
import { updateCourseForUser } from '../../repositories/schedule'
import { readLimitedJsonBody } from '../../utils/read-json-body'
import { requireUser } from '../../utils/require-user'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const courseId = getRouterParam(event, 'courseId')
  if (!courseId) throw createError({ statusCode: 404, message: '课程不存在' })
  return updateCourseForUser(user.id, courseId, await readLimitedJsonBody(event))
})
