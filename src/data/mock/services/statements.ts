import { addMonths, monthKey, type ISODate } from '@/lib/dates'
import type { Statement, StatementLine } from '../../models'
import type { MockDatabase } from '../db'

export function statementId(organizationId: string, period: string): string {
  return `st-${organizationId}-${period}`
}

export function parseStatementId(id: string): { organizationId: string; period: string } | null {
  const match = /^st-(.+)-(\d{4}-\d{2})$/.exec(id)
  return match ? { organizationId: match[1], period: match[2] } : null
}

/**
 * Estados de cuenta calculados con lo que K'Plan generó: cupones validados
 * (tarifa fija), meses con insignia activada y campañas compradas.
 */
export function buildStatements(db: MockDatabase, organizationId: string, today: ISODate): Statement[] {
  const currentPeriod = monthKey(today)
  const linesByPeriod = new Map<string, StatementLine[]>([[currentPeriod, []]])
  const add = (period: string, line: StatementLine) => {
    linesByPeriod.set(period, [...(linesByPeriod.get(period) ?? []), line])
  }
  const stopName = (stopId: string) => db.stops.find((stop) => stop.id === stopId)?.name ?? stopId

  const couponGroups = new Map<string, { period: string; couponId: string; fee: number; count: number; last: ISODate }>()
  for (const redemption of db.redemptions) {
    if (redemption.organizationId !== organizationId || redemption.status !== 'validated') continue
    if (!redemption.validatedAt || redemption.fee <= 0) continue
    const date = redemption.validatedAt.slice(0, 10)
    const period = monthKey(date)
    const key = `${period}|${redemption.couponId}|${redemption.fee}`
    const group = couponGroups.get(key) ?? { period, couponId: redemption.couponId, fee: redemption.fee, count: 0, last: date }
    group.count += 1
    if (date > group.last) group.last = date
    couponGroups.set(key, group)
  }
  for (const [key, group] of couponGroups) {
    const coupon = db.coupons.find((item) => item.id === group.couponId)
    add(group.period, {
      id: `fee-${key}`,
      date: group.last,
      kind: 'coupon_fee',
      description: coupon?.title ?? 'Cupón',
      quantity: group.count,
      unitPrice: group.fee,
      amount: group.count * group.fee,
    })
  }

  for (const activation of db.badgeActivations) {
    if (activation.organizationId !== organizationId) continue
    const last = monthKey(activation.cancelledAt ?? today)
    for (let period = monthKey(activation.startedAt); period <= last; period = addMonths(period, 1)) {
      add(period, {
        id: `act-${activation.id}-${period}`,
        date: period === monthKey(activation.startedAt) ? activation.startedAt : `${period}-01`,
        kind: 'badge_activation',
        description: stopName(activation.stopId),
        quantity: 1,
        unitPrice: activation.monthlyPrice,
        amount: activation.monthlyPrice,
      })
    }
  }

  for (const campaign of db.badgeCampaigns) {
    if (campaign.organizationId !== organizationId || campaign.status === 'cancelled') continue
    add(monthKey(campaign.createdAt), {
      id: `camp-${campaign.id}`,
      date: campaign.createdAt,
      kind: 'badge_campaign',
      description: `${stopName(campaign.stopId)} · ×${campaign.multiplier} · ${campaign.badgeBudget} insignias`,
      quantity: 1,
      unitPrice: campaign.price,
      amount: campaign.price,
    })
  }

  return [...linesByPeriod.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([period, lines]) => {
      const id = statementId(organizationId, period)
      const payment = db.payments.find((item) => item.statementId === id)
      const sorted = [...lines].sort((a, b) => a.kind.localeCompare(b.kind) || b.date.localeCompare(a.date))
      return {
        id,
        organizationId,
        period,
        lines: sorted,
        total: sorted.reduce((sum, line) => sum + line.amount, 0),
        status: period === currentPeriod ? 'open' : payment ? 'paid' : 'due',
        dueDate: `${addMonths(period, 1)}-10`,
        paidAt: payment?.paidAt ?? null,
      } satisfies Statement
    })
}
