import { createContext } from 'react'
import type { AuthResponse, LoginInput, Organization, SessionUser } from '@/data/models'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

/** `two-factor`: la contraseña era correcta pero falta el código del segundo factor. */
export type LoginOutcome = 'authenticated' | 'two-factor'

export interface AuthContextValue {
  status: AuthStatus
  user: SessionUser | null
  organization: Organization | null
  login: (input: LoginInput) => Promise<LoginOutcome>
  loginWithGoogle: (idToken: string) => Promise<LoginOutcome>
  /** Termina el inicio de sesión con el código del segundo factor. */
  verifyTwoFactor: (code: string) => Promise<void>
  /** Abre la sesión con la respuesta de una acción que ya la dejó abierta, como postularse. */
  acceptSession: (response: AuthResponse) => Promise<void>
  /** Vuelve a pedir a la persona de la sesión y su organización, p. ej. tras activar el 2FA o al aprobarla el equipo. */
  refreshUser: () => Promise<void>
  /** Cierra la sesión y avisa a la API para que borre las cookies. */
  logout: () => void
  /** Cierra la sesión en este navegador cuando la API ya la cerró (cambio de contraseña). */
  endSession: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
