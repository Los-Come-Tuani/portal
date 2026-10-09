import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError } from '@/data/api/errors'
import { sessionMarker } from '@/data/api/session-marker'
import { isPortalRole, type AuthResponse, type LoginInput, type Organization, type SessionUser } from '@/data/models'
import { authRepository } from '@/data/repositories/auth.repository'
import { organizationsRepository } from '@/data/repositories/organizations.repository'
import { NOT_PORTAL_MESSAGE } from '@/data/schemas/session.schema'
import { AuthContext, type AuthStatus, type LoginOutcome } from './auth-context'
import { statusAfterProfileFailure } from './session-status'
/** Cuánto se espera a que la API confirme el cierre de sesión antes de salir de todos modos. */
const LOGOUT_PATIENCE_MS = 2500

const loadOrganization = (user: SessionUser): Promise<Organization | null> => organizationsRepository.ofSession(user)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  // Las cookies de sesión son HttpOnly: solo se recuerda que hubo un inicio de sesión.
  const [status, setStatus] = useState<AuthStatus>(() => (sessionMarker.isSet() ? 'loading' : 'anonymous'))
  const [sessionError, setSessionError] = useState<unknown>(null)
  const [user, setUser] = useState<SessionUser | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)

  const clear = useCallback(() => {
    queryClient.clear()
    setUser(null)
    setOrganization(null)
    setStatus('anonymous')
  }, [queryClient])

  /** Deja a la persona dentro. Un rol que no entra al portal se cierra aquí mismo. */
  const openSession = useCallback(async (next: SessionUser) => {
    if (!isPortalRole(next.role)) {
      await authRepository.logout().catch(() => undefined)
      sessionMarker.clear()
      throw new ApiError(403, NOT_PORTAL_MESSAGE)
    }
    const org = await loadOrganization(next)
    sessionMarker.set()
    setUser(next)
    setOrganization(org)
    setStatus('authenticated')
  }, [])

  useEffect(() => {
    if (status !== 'loading') return
    let cancelled = false
    authRepository
      .profile()
      .then(async (me) => {
        if (!isPortalRole(me.role)) throw new ApiError(403, NOT_PORTAL_MESSAGE)
        const org = await loadOrganization(me)
        if (cancelled) return
        setUser(me)
        setOrganization(org)
        setStatus('authenticated')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const next = statusAfterProfileFailure(error)
        // Sólo un rechazo de la API borra el recuerdo de la sesión.
        if (next === 'anonymous') sessionMarker.clear()
        setSessionError(error)
        setStatus(next)
      })
    return () => {
      cancelled = true
    }
  }, [status])

  useEffect(() => sessionMarker.onExpired(clear), [clear])

  const retrySession = useCallback(() => {
    setStatus((current) => (current === 'unavailable' ? 'loading' : current))
  }, [])

  const login = useCallback(
    async (input: LoginInput): Promise<LoginOutcome> => {
      const result = await authRepository.login(input)
      if (result.status === 'two-factor') return 'two-factor'
      await openSession(result.user)
      return 'authenticated'
    },
    [openSession],
  )

  const loginWithGoogle = useCallback(
    async (accessToken: string): Promise<LoginOutcome> => {
      const result = await authRepository.loginWithGoogle(accessToken)
      if (result.status === 'two-factor') return 'two-factor'
      await openSession(result.user)
      return 'authenticated'
    },
    [openSession],
  )

  const verifyTwoFactor = useCallback(
    async (code: string) => openSession(await authRepository.verifyTwoFactor(code)),
    [openSession],
  )

  const acceptSession = useCallback(async (response: AuthResponse) => openSession(response.user), [openSession])

  /** Vuelve a pedir a la persona y a su organización: la aprobación del equipo cambia lo que ve. */
  const refreshUser = useCallback(async () => {
    const me = await authRepository.profile()
    const org = await loadOrganization(me)
    setUser(me)
    setOrganization(org)
  }, [])

  const endSession = useCallback(() => {
    sessionMarker.clear()
    clear()
  }, [clear])

  const logout = useCallback(() => {
    // Primero se le avisa a la API, que es quien borra las cookies de sesión; si tarda
    // demasiado o no hay conexión, se sale igual de este navegador.
    const closing = authRepository.logout().catch(() => undefined)
    const patience = new Promise<void>((resolve) => window.setTimeout(resolve, LOGOUT_PATIENCE_MS))
    void Promise.race([closing, patience]).then(endSession)
  }, [endSession])

  const value = useMemo(
    () => ({
      status,
      sessionError: status === 'unavailable' ? sessionError : null,
      retrySession,
      user,
      organization,
      login,
      loginWithGoogle,
      verifyTwoFactor,
      acceptSession,
      refreshUser,
      logout,
      endSession,
    }),
    [status, sessionError, retrySession, user, organization, login, loginWithGoogle, verifyTwoFactor, acceptSession, refreshUser, logout, endSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
