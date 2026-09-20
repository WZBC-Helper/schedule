import { createCourseForUser } from '../../repositories/schedule'
import { readLimitedJsonBody } from '../../utils/read-json-body'
import { requireUser } from '../../utils/require-user'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return createCourseForUser(user.id, await readLimitedJsonBody(event))
})
