import { createContext } from 'react'
import type { AuthResponse, LoginInput, Organization, SessionUser } from '@/data/models'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  status: AuthStatus
  user: SessionUser | null
  organization: Organization | null
  login: (input: LoginInput) => Promise<void>
  /** Abre la sesión con una respuesta que ya trae token, como la de postularse. */
  acceptSession: (response: AuthResponse) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
