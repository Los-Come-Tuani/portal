import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import type { ChangePasswordInput, LoginInput, LoginResult, ResetPasswordInput, SessionUser } from '../models'
import { apiChallengeSchema, apiLoginResponseSchema, apiSessionUserSchema, toSessionUser } from '../schemas/session.schema'

/**
 * Identidad y sesión contra el API. La sesión vive en cookies `HttpOnly`: aquí nunca se ve ni
 * se guarda un token.
 */
export const authRepository = {
  /** `two-factor`: la contraseña era correcta pero falta el código del segundo factor. */
  async login(input: LoginInput): Promise<LoginResult> {
    const data = await http.post<unknown>(endpoints.auth.login, { body: input })
    const challenge = apiChallengeSchema.safeParse(data)
    if (challenge.success) return { status: 'two-factor', expiresIn: challenge.data.expires_in }
    return { status: 'authenticated', user: toSessionUser(apiLoginResponseSchema.parse(data).user) }
  },

  /** Termina el inicio de sesión con el código de la app de autenticación o uno de recuperación. */
  async verifyTwoFactor(code: string): Promise<SessionUser> {
    const data = await http.post<unknown>(endpoints.auth.twoFactor, { body: { code } })
    return toSessionUser(apiLoginResponseSchema.parse(data).user)
  },

  logout: () => http.post<void>(endpoints.auth.logout),

  /** Quién es la persona de la sesión; falla con 401 si no hay sesión. */
  async profile(): Promise<SessionUser> {
    return toSessionUser(apiSessionUserSchema.parse(await http.get<unknown>(endpoints.auth.profile)))
  },

  /** Responde igual exista o no la cuenta: no revela quién está registrado. */
  forgotPassword: (email: string) => http.post<void>(endpoints.auth.passwordForgot, { body: { email } }),

  /** Cambia la contraseña con el código del correo y cierra todas las sesiones. */
  resetPassword: (input: ResetPasswordInput) => http.post<void>(endpoints.auth.passwordReset, { body: input }),

  /** También cierra todas las sesiones: hay que volver a entrar. */
  changePassword: ({ currentPassword, password }: ChangePasswordInput) =>
    http.post<void>(endpoints.auth.passwordChange, { body: { current_password: currentPassword, password } }),

  /** Cierra la sesión en todos los dispositivos, incluido este. */
  revokeSessions: () => http.post<void>(endpoints.auth.sessionRevoke),
}
