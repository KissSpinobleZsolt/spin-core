/** Shape of an authenticated user as returned by the login endpoint. */
export type AuthUser = {
  name: string
  roles: string[]
  defaultTheme: 'dark' | 'light'
}

/** Credentials payload for email/password login. */
export type AuthCredentials = {
  email: string
  password: string
}
