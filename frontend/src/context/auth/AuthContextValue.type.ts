import type { AuthCredentials, AuthUser } from '@services'

/** Shape of the value exposed by AuthContext. */
export type AuthContextValue = {
  user: AuthUser | null
  login(credentials: AuthCredentials): Promise<void>
  logout(): void
}
