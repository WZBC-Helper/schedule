export interface CurrentUser {
  id: string
  name: string
  email: string
  image: string | null
  emailVerified: boolean
}

export interface CurrentSessionPayload {
  user: CurrentUser
}
