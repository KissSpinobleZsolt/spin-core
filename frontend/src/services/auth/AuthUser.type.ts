/** Shape of an authenticated user as returned by the login endpoint. */
export type AuthUser = {
  name: string
  roles: string[]
  defaultTheme: 'dark' | 'light'
}
