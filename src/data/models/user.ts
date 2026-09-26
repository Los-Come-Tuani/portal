export type UserRole = 'admin' | 'negocio' | 'alcaldia'

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin K'Plan",
  negocio: 'Negocio',
  alcaldia: 'Alcaldía',
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  /** `null` para el equipo de K'Plan. */
  organizationId: string | null
}

export interface AuthResponse {
  token: string
  user: User
}

export interface LoginInput {
  email: string
  password: string
}
