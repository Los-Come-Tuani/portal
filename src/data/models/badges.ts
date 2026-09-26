import type { ISODate } from './common'

/** Activar la insignia en un lugar que hoy no da: cargo mensual. */
export interface BadgeActivation {
  id: string
  organizationId: string
  stopId: string
  status: 'active' | 'cancelled'
  startedAt: ISODate
  cancelledAt: ISODate | null
  monthlyPrice: number
}

export const BADGE_MULTIPLIERS = [2, 3, 5] as const
export type BadgeMultiplier = (typeof BADGE_MULTIPLIERS)[number]

export type CampaignStatus = 'scheduled' | 'active' | 'finished' | 'cancelled'

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  scheduled: 'Programada',
  active: 'Activa',
  finished: 'Terminada',
  cancelled: 'Cancelada',
}

/**
 * Campaña de insignias extra: durante las fechas, cada visita confirmada con
 * QR da `multiplier` insignias en vez de 1, hasta gastar las insignias
 * compradas. El lugar sale destacado en la app mientras dure.
 */
export interface BadgeCampaign {
  id: string
  organizationId: string
  stopId: string
  multiplier: BadgeMultiplier
  startDate: ISODate
  endDate: ISODate
  /** Insignias extra compradas (el paquete). */
  badgeBudget: number
  /** Insignias extra ya entregadas; lo calcula el servidor. */
  extraAwarded: number
  price: number
  status: CampaignStatus
  createdAt: ISODate
}

export interface BadgeCampaignInput {
  stopId: string
  multiplier: BadgeMultiplier
  startDate: ISODate
  endDate: ISODate
  packId: string
}

export interface BadgePack {
  id: string
  badges: number
  price: number
}
