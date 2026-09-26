import type { ISODate } from './common'

export const ORGANIZATION_TYPES = ['negocio', 'alcaldia'] as const
export type OrganizationType = (typeof ORGANIZATION_TYPES)[number]

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  negocio: 'Negocio',
  alcaldia: 'Alcaldía',
}

export type OrganizationStatus = 'pending' | 'active' | 'suspended'

export const ORGANIZATION_STATUS_LABELS: Record<OrganizationStatus, string> = {
  pending: 'En revisión',
  active: 'Activa',
  suspended: 'Suspendida',
}

/** Quién es dueño de qué: la app no tiene este concepto, lo agrega el portal. */
export interface Organization {
  id: string
  type: OrganizationType
  name: string
  /** "Restaurante", "Finca cafetalera", "Alcaldía municipal"… */
  kind: string
  city: string
  stopIds: string[]
  status: OrganizationStatus
  contactName: string
  contactEmail: string
  contactPhone: string
  joinedAt: ISODate
}

export type OrganizationInput = Omit<Organization, 'id' | 'joinedAt'>
