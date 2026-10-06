import type { Permission } from './access'
import type { ISODate, LocalDateTime } from './common'
import type { GuideServiceRole } from './guide'
import type { OrganizationRef } from './organization'

/**
 * Todos los usuarios de K'Plan. `admin` es el equipo interno (lo que puede
 * hacer depende de su rol interno); `guia` y `turista` usan la app y no
 * entran al portal.
 */
export type UserRole = 'admin' | 'negocio' | 'alcaldia' | 'guia' | 'turista'

/** Los roles que entran al portal. */
export const PORTAL_ROLES = ['admin', 'negocio', 'alcaldia'] as const
export type PortalRole = (typeof PORTAL_ROLES)[number]

export function isPortalRole(role: UserRole): role is PortalRole {
  return (PORTAL_ROLES as readonly UserRole[]).includes(role)
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Equipo K'Plan",
  negocio: 'Negocio',
  alcaldia: 'Alcaldía',
  guia: 'Guía o traductor',
  turista: 'Turista',
}

/** `invited`: del equipo, todavía no entra por primera vez. */
export type UserStatus = 'active' | 'suspended' | 'invited'

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Activa',
  suspended: 'Suspendida',
  invited: 'Invitación enviada',
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  /** Sólo negocios y alcaldías. */
  organizationId: string | null
  /** Sólo el equipo de K'Plan. */
  staffRoleId: string | null
  /** Sólo guías y traductores. */
  serviceRole: GuideServiceRole | null
  status: UserStatus
  phone: string
  city: string | null
  createdAt: ISODate
  lastSeenAt: LocalDateTime | null
}

/** El usuario de la sesión, con lo que su rol interno le permite. */
export interface SessionUser extends User {
  permissions: Permission[]
  staffRoleName: string | null
  /** El segundo factor de la cuenta: si ya lo activó y si su rol lo exige. */
  twoFactor: { enabled: boolean; required: boolean }
  /** Lo que el API dice de su organización; `null` para el equipo y para el modo demo. */
  organizationRef: OrganizationRef | null
}

/** Abrir una sesión: la API la guarda en cookies, así que solo devuelve a la persona. */
export interface AuthResponse {
  user: SessionUser
}

export interface LoginInput {
  email: string
  password: string
}

export interface UserUpdate {
  status?: UserStatus
  staffRoleId?: string
}

export interface StaffInviteInput {
  name: string
  email: string
  staffRoleId: string
}
