import type { CurrentSessionPayload } from '#shared/types/auth'

const PUBLIC_ROUTES = new Set(['/login', '/register'])

export default defineNuxtRouteMiddleware(async (to) => {
  const endpoint: string = '/api/me'
  let session: CurrentSessionPayload | null = null
  try {
    session = import.meta.server
      ? await useRequestFetch()<CurrentSessionPayload>(endpoint)
      : await $fetch<CurrentSessionPayload>(endpoint)
  }
  catch {
    session = null
  }
  const isPublicRoute = PUBLIC_ROUTES.has(to.path)

  if (!session && !isPublicRoute) {
    return navigateTo({
      path: '/login',
      query: to.fullPath === '/' ? undefined : { redirect: to.fullPath },
    })
  }

  if (session && isPublicRoute) {
    return navigateTo('/')
  }
})
