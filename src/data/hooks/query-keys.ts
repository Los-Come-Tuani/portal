import type { AccountFilters, CircuitFilters, ProviderQueueFilters, QueueFilters, StopFilters } from '../models'
import type { EventFilters } from '../repositories/events.repository'
import type { OrganizationFilters } from '../repositories/organizations.repository'
import type { PlaceRequestFilters } from '../repositories/place-requests.repository'
import type { PaymentFilters, StatementFilters, WithdrawalFilters } from '../repositories/billing.repository'
import type { CampaignFilters, RedemptionFilters } from '../repositories/coupons.repository'
import type { DisputeFilters } from '../repositories/moderation.repository'
import type { VisitFilters } from '../repositories/visits.repository'

/** Todas las llaves de caché en un lugar, para invalidar sin adivinar. */
export const queryKeys = {
  catalog: {
    cities: ['catalog', 'cities'] as const,
    businessTypes: ['catalog', 'business-types'] as const,
    institutionTypes: ['catalog', 'institution-types'] as const,
  },
  /** La solicitud de quien entró (F3). */
  applications: {
    mine: ['applications', 'mine'] as const,
  },
  /** La cola de verificación del equipo (F3). */
  verification: {
    all: ['verification'] as const,
    list: (filters: QueueFilters) => ['verification', 'list', filters] as const,
    detail: (requestId: string) => ['verification', 'detail', requestId] as const,
    reasons: ['verification', 'reasons'] as const,
  },
  organizations: {
    all: ['organizations'] as const,
    list: (filters: OrganizationFilters) => ['organizations', 'list', filters] as const,
    detail: (organizationId: string) => ['organizations', 'detail', organizationId] as const,
  },
  places: {
    all: ['places'] as const,
    list: (filters: StopFilters) => ['places', 'list', filters] as const,
    page: (filters: StopFilters & { page: number; pageSize: number }) => ['places', 'page', filters] as const,
    /** Los lugares activos de una ciudad (ruta pública `stop/`). */
    city: (cityCode: string) => ['places', 'city', cityCode] as const,
    detail: (stopId: string) => ['places', 'detail', stopId] as const,
    profile: (stopId: string) => ['places', 'profile', stopId] as const,
    posts: (stopId: string) => ['places', 'posts', stopId] as const,
    qr: (stopId: string) => ['places', 'qr', stopId] as const,
  },
  circuits: {
    all: ['circuits'] as const,
    list: (filters: CircuitFilters) => ['circuits', 'list', filters] as const,
    /** Los publicados (ruta pública `circuit/`). */
    published: ['circuits', 'published'] as const,
    detail: (circuitId: string) => ['circuits', 'detail', circuitId] as const,
    departures: (circuitId: string) => ['circuits', 'departures', circuitId] as const,
  },
  events: {
    all: ['events'] as const,
    list: (filters: EventFilters) => ['events', 'list', filters] as const,
    categories: ['catalog', 'event-categories'] as const,
  },
  coupons: {
    all: ['coupons'] as const,
    campaigns: (filters: CampaignFilters) => ['coupons', 'campaigns', filters] as const,
    redemptions: (filters: RedemptionFilters) => ['coupons', 'redemptions', filters] as const,
    benefitTypes: ['catalog', 'benefit-types'] as const,
  },
  badges: {
    all: ['badges'] as const,
    activations: (organizationId: string | undefined) => ['badges', 'activations', organizationId ?? 'all'] as const,
    campaigns: (organizationId: string | undefined) => ['badges', 'campaigns', organizationId ?? 'all'] as const,
  },
  billing: {
    all: ['billing'] as const,
    payments: (filters: PaymentFilters) => ['billing', 'payments', filters] as const,
    withdrawals: (filters: WithdrawalFilters) => ['billing', 'withdrawals', filters] as const,
    statements: (filters: StatementFilters) => ['billing', 'statements', filters] as const,
    pricing: ['billing', 'pricing'] as const,
  },
  visits: {
    all: ['visits'] as const,
    events: (filters: VisitFilters) => ['visits', 'events', filters] as const,
  },
  /** El directorio de cuentas ("Todos los usuarios"). */
  accounts: {
    all: ['accounts'] as const,
    list: (filters: AccountFilters) => ['accounts', 'list', filters] as const,
  },
  staffRoles: ['staff-roles'] as const,
  staffMembers: ['staff-members'] as const,
  security: {
    twoFactor: ['security', 'two-factor'] as const,
  },
  placeRequests: {
    all: ['place-requests'] as const,
    list: (filters: PlaceRequestFilters) => ['place-requests', 'list', filters] as const,
  },
  /** La moderación del equipo: reseñas impugnadas, reportes y sanciones (F7 y F8). */
  moderation: {
    all: ['moderation'] as const,
    disputes: (filters: DisputeFilters) => ['moderation', 'disputes', filters] as const,
  },
  /** La cola de guías y traductores (F5). */
  providers: {
    all: ['providers'] as const,
    list: (filters: ProviderQueueFilters) => ['providers', 'list', filters] as const,
    detail: (requestId: string) => ['providers', 'detail', requestId] as const,
    reasons: ['providers', 'reasons'] as const,
  },
}
