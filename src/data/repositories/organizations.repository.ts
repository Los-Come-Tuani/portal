import { env } from '@/config/env'
import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import {
  organizationFromRef,
  type Organization,
  type OrganizationInput,
  type OrganizationStatus,
  type OrganizationType,
  type SessionUser,
} from '../models'

export interface OrganizationFilters {
  type?: OrganizationType
  status?: OrganizationStatus
  q?: string
}

export const organizationsRepository = {
  list: (filters: OrganizationFilters = {}) =>
    http.get<Organization[]>(endpoints.organizations.list, { query: { ...filters } }),
  get: (organizationId: string) => http.get<Organization>(endpoints.organizations.detail(organizationId)),
  /**
   * La organización de quien entró. El API de F3 solo entrega su referencia en la sesión (nombre,
   * clase y si ya la verificó el equipo): con eso se arma, sin pedir nada más. El detalle (ciudad,
   * lugares) llega con los lugares; el modo demo ya lo tiene.
   */
  async ofSession(user: SessionUser): Promise<Organization | null> {
    if (!user.organizationId) return null
    if (env.useMocks) return organizationsRepository.get(user.organizationId)
    return user.organizationRef ? organizationFromRef(user.organizationRef, user.createdAt) : null
  },
  update: (organizationId: string, input: OrganizationInput) =>
    http.put<Organization>(endpoints.organizations.detail(organizationId), { body: input }),
}
