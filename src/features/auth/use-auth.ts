import { useContext } from 'react'
import type { Organization, User, UserRole } from '@/data/models'
import { AuthContext, type AuthContextValue } from './auth-context'

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth necesita <AuthProvider>')
  return context
}

export interface Session {
  user: User
  organization: Organization | null
  role: UserRole
  isAdmin: boolean
  /** La organización del usuario; `undefined` para el admin (ve todas). */
  organizationId: string | undefined
}

/** La sesión dentro de las rutas protegidas, donde siempre hay usuario. */
export function useSession(): Session {
  const { user, organization } = useAuth()
  if (!user) throw new Error('useSession sólo funciona dentro de una ruta protegida')
  return {
    user,
    organization,
    role: user.role,
    isAdmin: user.role === 'admin',
    organizationId: user.organizationId ?? undefined,
  }
}
