import type { AuthUser } from './AuthUser.type'

export const BASE_PATH = 'auth' // root segment for all authentication endpoints
export const IS_MOCK = import.meta.env.VITE_USE_MOCK === 'true' // skip real API calls in mock mode
export const USER_KEY = 'auth_user' // localStorage key for the persisted user object

export const MOCK_USER: AuthUser = { // static user returned when IS_MOCK is true
  name: 'User Doe',
  roles: ['user', 'admin'],
  defaultTheme: 'dark',
}
