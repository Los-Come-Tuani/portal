import type { Permission } from './access'
import type { ISODate, LocalDateTime } from './common'
import type { GuideServiceRole } from './guide'
import type { OrganizationRef } from './organization'
import type { ProviderStatus } from './provider'

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

// ── El directorio de cuentas ("Todos los usuarios", `GET /auth/account/`) ──

/** Los papeles por los que filtra el API: uno por pestaña. */
export const ACCOUNT_ROLES = ['turista', 'guia', 'traductor', 'negocio', 'alcaldia', 'institucion', 'admin'] as const
export type AccountRole = (typeof ACCOUNT_ROLES)[number]

/**
 * `pending` es una invitación del equipo sin aceptar o una cuenta que no terminó de activarse;
 * `closing`, una cuenta que su dueño pidió cerrar.
 */
export const ACCOUNT_STATUSES = ['active', 'pending', 'suspended', 'closing', 'expelled'] as const
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  active: 'Activa',
  pending: 'Sin activar',
  suspended: 'Suspendida',
  closing: 'Cerrándose',
  expelled: 'Expulsada',
}

/** Una cuenta del directorio, con lo que el API dice de su papel. */
export interface Account {
  id: string
  name: string
  firstName: string
  lastName: string
  email: string
  /** `null`: todavía no tiene un papel (un guía cuya solicitud sigue en revisión). */
  role: UserRole | null
  /** Solo guías y traductores. */
  serviceRole: GuideServiceRole | null
  /** `invited` es una persona del equipo que no ha aceptado la invitación. */
  status: AccountStatus | 'invited'
  superuser: boolean
  /** Solo el equipo de K'Plan; un superusuario puede no tener. */
  staffRole: { id: string; name: string } | null
  organization: OrganizationRef | null
  /** El perfil de guía o traductor, si tiene. */
  provider: { id: string; status: ProviderStatus; services: string[] } | null
  /** La ciudad de su organización o de su perfil de prestador. */
  city: string | null
  createdAt: ISODate
}

export interface AccountFilters {
  role?: AccountRole
  status?: AccountStatus
  search?: string
  page?: number
  pageSize?: number
}

/** El API corrige el nombre desde el directorio; el correo tiene su propio procedimiento. */
export interface AccountNameInput {
  firstName: string
  lastName: string
}

export interface StaffInviteInput {
  name: string
  email: string
  staffRoleId: string
}
