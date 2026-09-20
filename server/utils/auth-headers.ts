import type { H3Event } from 'h3'
import { getRequestIP } from 'h3'

export function getTrustedAuthHeaders(event: H3Event): Headers {
  const headers = new Headers(event.headers)
  const clientIp = getRequestIP(event, { xForwardedFor: false })
    ?? event.node.req.socket.remoteAddress
    ?? '127.0.0.1'

  // Use an application-owned header and overwrite any incoming value. This
  // prevents clients from spoofing the rate-limit identity. A production
  // reverse proxy can be added to the trusted chain explicitly later.
  headers.set('x-wzbc-client-ip', clientIp)
  return headers
}
