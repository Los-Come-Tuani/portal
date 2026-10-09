import { ORGANIZATION_KIND_LABELS, type OrganizationKind } from './application'
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

/** Sus lugares no van aquí: se asignan y se quitan uno por uno. */
export type OrganizationInput = Omit<Organization, 'id' | 'joinedAt' | 'stopIds'>

/** Lo que la sesión del API dice de la organización de quien entró (`user.organization`). */
export interface OrganizationRef {
  id: string
  kind: OrganizationKind
  name: string
  /** La verificó el equipo; hasta entonces quien entró solo ve su solicitud. */
  verified: boolean
}

/**
 * La organización armada con la referencia de la sesión. Lo demás (ciudad, lugares, contacto)
 * todavía no lo publica el API: llega con los lugares. El portal solo trata a las instituciones
 * como alcaldías.
 */
export function organizationFromRef(ref: OrganizationRef, joinedAt: ISODate): Organization {
  return {
    id: ref.id,
    type: ref.kind === 'business' ? 'negocio' : 'alcaldia',
    name: ref.name,
    kind: ORGANIZATION_KIND_LABELS[ref.kind],
    city: '',
    stopIds: [],
    status: ref.verified ? 'active' : 'pending',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    joinedAt,
  }
}
