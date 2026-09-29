import { Handshake, Medal, TicketPercent } from 'lucide-react'
import type { ReactNode } from 'react'
import { CHARGE_KIND_LABELS, type ChargeKind, type Statement } from '@/data/models'
import { formatDayMonth, formatMoney, formatNumber } from '@/lib/format'

const KIND_ORDER: ChargeKind[] = ['assisted_onboarding', 'coupon_fee', 'badge_activation', 'badge_campaign']

const KIND_HELP: Record<ChargeKind, string> = {
  coupon_fee: 'Tarifa fija por cada cupón que validaste.',
  badge_activation: 'Cargo mensual por cada lugar con la insignia activada.',
  badge_campaign: 'Insignias extra compradas para una campaña.',
  assisted_onboarding: "Una sola vez: el equipo de K'Plan preparó tu solicitud y tus documentos.",
}

const KIND_ICONS: Record<ChargeKind, ReactNode> = {
  coupon_fee: <TicketPercent size={16} aria-hidden="true" />,
  badge_activation: <Medal size={16} aria-hidden="true" />,
  badge_campaign: <Medal size={16} aria-hidden="true" />,
  assisted_onboarding: <Handshake size={16} aria-hidden="true" />,
}

/** Cada línea del estado de cuenta, agrupada y explicada: se cobra lo que K'Plan generó. */
export function StatementView({ statement }: { statement: Statement }) {
  if (statement.lines.length === 0) {
    return <p className="text-body text-muted">Sin cargos este mes todavía.</p>
  }

  return (
    <div className="flex flex-col gap-5">
      {KIND_ORDER.map((kind) => {
        const lines = statement.lines.filter((line) => line.kind === kind)
        if (lines.length === 0) return null
        const subtotal = lines.reduce((sum, line) => sum + line.amount, 0)
        return (
          <section key={kind} aria-label={CHARGE_KIND_LABELS[kind]}>
            <header className="flex items-baseline justify-between gap-4 border-b border-divider pb-2">
              <div className="flex items-center gap-2">
                <span className="text-badge-deep">{KIND_ICONS[kind]}</span>
                <h3 className="text-body font-semibold text-ink">{CHARGE_KIND_LABELS[kind]}</h3>
                <span className="hidden text-caption text-muted sm:inline">{KIND_HELP[kind]}</span>
              </div>
              <span className="text-body font-semibold text-ink tabular-nums">{formatMoney(subtotal)}</span>
            </header>
            <ul className="divide-y divide-divider/70">
              {lines.map((line) => (
                <li key={line.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 py-2 text-small sm:grid-cols-[minmax(0,1fr)_10rem_7rem]">
                  <span className="min-w-0 truncate text-ink">{line.description}</span>
                  <span className="hidden text-right text-muted tabular-nums sm:block">
                    {line.quantity > 1 ? `${formatNumber(line.quantity)} × ${formatMoney(line.unitPrice)}` : formatDayMonth(line.date)}
                  </span>
                  <span className="text-right font-medium text-ink tabular-nums">{formatMoney(line.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
      <div className="flex items-baseline justify-between border-t-2 border-ink pt-3">
        <span className="text-body font-semibold text-ink">Total</span>
        <span className="text-title font-bold text-ink tabular-nums">{formatMoney(statement.total)}</span>
      </div>
    </div>
  )
}
