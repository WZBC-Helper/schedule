import type { CurrentSessionPayload } from '../../shared/types/auth'
import { requireSession } from '../utils/require-user'

export default defineEventHandler(async (event): Promise<CurrentSessionPayload> => {
  const { user } = await requireSession(event)
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image ?? null,
      emailVerified: user.emailVerified,
    },
  }
})
