import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import type { AuthResponse, LoginInput, SessionUser } from '../models'

export const authRepository = {
  login: (input: LoginInput) => http.post<AuthResponse>(endpoints.auth.login, { body: input }),
  me: () => http.get<SessionUser>(endpoints.auth.me),
  forgotPassword: (email: string) => http.post<void>(endpoints.auth.forgotPassword, { body: { email } }),
}
