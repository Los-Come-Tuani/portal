import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import type { Organization, OrganizationInput, OrganizationStatus, OrganizationType } from '../models'

export interface OrganizationFilters {
  type?: OrganizationType
  status?: OrganizationStatus
  q?: string
}

export const organizationsRepository = {
  list: (filters: OrganizationFilters = {}) =>
    http.get<Organization[]>(endpoints.organizations.list, { query: { ...filters } }),
  get: (organizationId: string) => http.get<Organization>(endpoints.organizations.detail(organizationId)),
  create: (input: OrganizationInput) => http.post<Organization>(endpoints.organizations.list, { body: input }),
  update: (organizationId: string, input: OrganizationInput) =>
    http.put<Organization>(endpoints.organizations.detail(organizationId), { body: input }),
}
