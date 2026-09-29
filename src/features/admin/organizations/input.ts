import type { Organization, OrganizationInput } from '@/data/models'

/** Lo que se guarda de una organización, a partir de como está hoy. */
export function toOrganizationInput(organization: Organization, patch: Partial<OrganizationInput> = {}): OrganizationInput {
  const { id: _id, joinedAt: _joinedAt, stopIds: _stopIds, ...input } = organization
  return { ...input, ...patch }
}
