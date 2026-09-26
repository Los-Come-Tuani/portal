import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import type { AuthResponse, LoginInput, User } from '../models'

export const authRepository = {
  login: (input: LoginInput) => http.post<AuthResponse>(endpoints.auth.login, { body: input }),
  me: () => http.get<User>(endpoints.auth.me),
  forgotPassword: (email: string) => http.post<void>(endpoints.auth.forgotPassword, { body: { email } }),
}
