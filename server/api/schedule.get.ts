import { getScheduleForUser } from '../repositories/schedule'
import { requireUser } from '../utils/require-user'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return getScheduleForUser(user.id)
})
