import { auth } from '#server/utils/auth'
import { getTrustedAuthHeaders } from '#server/utils/auth-headers'

export default defineEventHandler((event) => {
  const request = toWebRequest(event)
  return auth.handler(new Request(request, { headers: getTrustedAuthHeaders(event) }))
})
