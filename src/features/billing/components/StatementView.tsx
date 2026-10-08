import { Medal, Receipt, TicketPercent } from 'lucide-react'
import type { MonthlyStatement } from '@/data/models'
import { formatMoney, formatNumber } from '@/lib/format'

const CONCEPT_ICONS: Record<string, typeof Medal> = {
  insignia_mensual: Medal,
  cupon_validado: TicketPercent,
}

/** Las líneas de un estado de cuenta: la insignia del lugar y los cupones validados, con su tarifa. */
export function StatementView({ statement }: { statement: Pick<MonthlyStatement, 'lines' | 'total'> }) {
  if (statement.lines.length === 0) return <p className="text-body text-muted">Sin cargos este mes.</p>
  return (
    <div className="flex flex-col gap-3">
      <ul className="divide-y divide-divider/70">
        {statement.lines.map((line, index) => {
          const Icon = CONCEPT_ICONS[line.concept] ?? Receipt
          return (
            <li key={`${line.concept}-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 py-2 text-small sm:grid-cols-[minmax(0,1fr)_10rem_7rem]">
              <span className="flex min-w-0 items-center gap-2 text-ink">
                <Icon size={15} className="shrink-0 text-badge-deep" aria-hidden="true" />
                <span className="truncate">{line.description}</span>
              </span>
              <span className="hidden text-right text-muted tabular-nums sm:block">
                {formatNumber(line.quantity)} × {formatMoney(line.unitPrice)}
              </span>
              <span className="text-right font-medium text-ink tabular-nums">{formatMoney(line.amount)}</span>
            </li>
          )
        })}
      </ul>
      <div className="flex items-baseline justify-between border-t-2 border-ink pt-3">
        <span className="text-body font-semibold text-ink">Total</span>
        <span className="text-title font-bold text-ink tabular-nums">{formatMoney(statement.total)}</span>
      </div>
    </div>
  )
}
