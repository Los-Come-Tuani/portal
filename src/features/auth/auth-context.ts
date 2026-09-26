import { createContext } from 'react'
import type { LoginInput, Organization, SessionUser } from '@/data/models'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  status: AuthStatus
  user: SessionUser | null
  organization: Organization | null
  login: (input: LoginInput) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
