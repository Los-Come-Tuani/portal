import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { sessionToken } from '@/data/api/session-token'
import type { AuthResponse, LoginInput, Organization, SessionUser, User } from '@/data/models'
import { authRepository } from '@/data/repositories/auth.repository'
import { organizationsRepository } from '@/data/repositories/organizations.repository'
import { AuthContext, type AuthStatus } from './auth-context'

async function loadOrganization(user: User): Promise<Organization | null> {
  return user.organizationId ? organizationsRepository.get(user.organizationId) : null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<AuthStatus>(() => (sessionToken.get() ? 'loading' : 'anonymous'))
  const [user, setUser] = useState<SessionUser | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)

  const clear = useCallback(() => {
    queryClient.clear()
    setUser(null)
    setOrganization(null)
    setStatus('anonymous')
  }, [queryClient])

  useEffect(() => {
    if (status !== 'loading') return
    let cancelled = false
    authRepository
      .me()
      .then(async (me) => {
        const org = await loadOrganization(me)
        if (cancelled) return
        setUser(me)
        setOrganization(org)
        setStatus('authenticated')
      })
      .catch(() => {
        if (cancelled) return
        sessionToken.clear()
        setStatus('anonymous')
      })
    return () => {
      cancelled = true
    }
  }, [status])

  useEffect(() => sessionToken.onExpired(clear), [clear])

  const acceptSession = useCallback(async (response: AuthResponse) => {
    sessionToken.set(response.token)
    const org = await loadOrganization(response.user)
    setUser(response.user)
    setOrganization(org)
    setStatus('authenticated')
  }, [])

  const login = useCallback(
    async (input: LoginInput) => acceptSession(await authRepository.login(input)),
    [acceptSession],
  )

  const logout = useCallback(() => {
    sessionToken.clear()
    clear()
  }, [clear])

  const value = useMemo(
    () => ({ status, user, organization, login, acceptSession, logout }),
    [status, user, organization, login, acceptSession, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
