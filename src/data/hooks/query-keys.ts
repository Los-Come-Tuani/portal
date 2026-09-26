import type { EventFilters } from '../repositories/events.repository'
import type { GuideApplicationFilters } from '../repositories/guides.repository'
import type { OrganizationFilters } from '../repositories/organizations.repository'
import type { RedemptionFilters } from '../repositories/coupons.repository'
import type { StopFilters } from '../repositories/places.repository'
import type { UserFilters } from '../repositories/users.repository'
import type { VisitFilters } from '../repositories/visits.repository'

/** Todas las llaves de caché en un lugar, para invalidar sin adivinar. */
export const queryKeys = {
  organizations: {
    all: ['organizations'] as const,
    list: (filters: OrganizationFilters) => ['organizations', 'list', filters] as const,
    detail: (organizationId: string) => ['organizations', 'detail', organizationId] as const,
  },
  places: {
    all: ['places'] as const,
    list: (filters: StopFilters) => ['places', 'list', filters] as const,
    detail: (stopId: string) => ['places', 'detail', stopId] as const,
    profile: (stopId: string) => ['places', 'profile', stopId] as const,
    posts: (stopId: string | undefined) => ['places', 'posts', stopId ?? 'all'] as const,
  },
  circuits: ['circuits'] as const,
  events: {
    all: ['events'] as const,
    list: (filters: EventFilters) => ['events', 'list', filters] as const,
  },
  coupons: {
    all: ['coupons'] as const,
    list: (organizationId: string | undefined) => ['coupons', 'list', organizationId ?? 'all'] as const,
    redemptions: (filters: RedemptionFilters) => ['coupons', 'redemptions', filters] as const,
  },
  badges: {
    all: ['badges'] as const,
    activations: (organizationId: string | undefined) => ['badges', 'activations', organizationId ?? 'all'] as const,
    campaigns: (organizationId: string | undefined) => ['badges', 'campaigns', organizationId ?? 'all'] as const,
  },
  billing: {
    all: ['billing'] as const,
    statements: (organizationId: string | undefined) => ['billing', 'statements', organizationId ?? 'all'] as const,
    pricing: ['billing', 'pricing'] as const,
  },
  visits: {
    all: ['visits'] as const,
    events: (filters: VisitFilters) => ['visits', 'events', filters] as const,
  },
  users: {
    all: ['users'] as const,
    list: (filters: UserFilters) => ['users', 'list', filters] as const,
    detail: (userId: string) => ['users', 'detail', userId] as const,
  },
  staffRoles: ['staff-roles'] as const,
  guides: {
    all: ['guides'] as const,
    list: (filters: GuideApplicationFilters) => ['guides', 'list', filters] as const,
    reviewers: ['guides', 'reviewers'] as const,
    detail: (applicationId: string) => ['guides', 'detail', applicationId] as const,
  },
}
