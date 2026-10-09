import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '@/app/router/paths'
import { InlineError, Panel, SkeletonRows } from '@/components/ui'
import { useVisitEvents } from '@/data/hooks/use-visits'
import type { DropReason } from '@/data/models'
import { addDays } from '@/lib/dates'
import { formatPercent } from '@/lib/format'
import { summarizeDrops } from '../lib/agenda'

interface DropReasonsProps {
  stopIds: string[] | undefined
  today: string
  /** A dónde lleva el consejo de "revisa tu ficha". */
  profilePath: string
  canOfferCoupons: boolean
}

const WINDOW_DAYS = 30

function advice(reason: DropReason, profilePath: string, canOfferCoupons: boolean) {
  switch (reason) {
    case 'closed':
      return {
        text: '"Estaba cerrado" es la razón más común. Revisa que el horario de tu ficha sea el real: la app avisa al turista antes de salir.',
        to: profilePath,
        cta: 'Revisar el horario',
      }
    case 'no_time':
      return {
        text: 'La mayoría lo deja por falta de tiempo. Un tiempo de visita realista ayuda a que el itinerario cuadre.',
        to: profilePath,
        cta: 'Revisar el tiempo de visita',
      }
    case 'too_far':
      return {
        text: 'Lo dejan por la distancia. Con más insignias por visita, el viaje vale más la pena.',
        to: paths.badges,
        cta: 'Ver campañas de insignias',
      }
    case 'too_expensive':
      return canOfferCoupons
        ? { text: 'Lo sienten caro. Un cupón puede convencer a quien duda.', to: paths.coupons, cta: 'Crear un cupón' }
        : { text: 'Lo sienten caro. Revisa que los precios en tu ficha estén claros.', to: profilePath, cta: 'Revisar la ficha' }
    default:
      return {
        text: 'Las fotos y la descripción son lo primero que ve el turista: que muestren lo mejor del lugar.',
        to: profilePath,
        cta: 'Mejorar la ficha',
      }
  }
}

export function DropReasons({ stopIds, today, profilePath, canOfferCoupons }: DropReasonsProps) {
  const events = useVisitEvents({ stopIds, from: addDays(today, -(WINDOW_DAYS - 1)), to: today })
  const summary = summarizeDrops(events.data ?? [])
  const top = summary.reasons[0]
  const tip = top ? advice(top.reason, profilePath, canOfferCoupons) : null

  return (
    <Panel title="Por qué no llegaron" description={`Lo que respondieron los turistas en los últimos ${WINDOW_DAYS} días.`}>
      {events.isPending ? (
        <SkeletonRows rows={3} />
      ) : events.isError ? (
        <InlineError error={events.error} onRetry={() => void events.refetch()} />
      ) : summary.total === 0 ? (
        <p className="text-body text-muted">Nadie quitó este lugar de su itinerario en este tiempo.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {summary.reasons.map((item) => (
              <li key={item.reason} className="grid grid-cols-[minmax(0,11rem)_1fr_3.5rem] items-center gap-3 text-small">
                <span className="truncate text-ink">{item.label}</span>
                <span className="h-2 overflow-hidden rounded-full bg-paper" aria-hidden="true">
                  <span
                    className={item === top ? 'block h-full rounded-full bg-danger' : 'block h-full rounded-full bg-ink/35'}
                    style={{ width: `${(item.count / top.count) * 100}%` }}
                  />
                </span>
                <span className="text-right text-muted tabular-nums">
                  {item.count} · {formatPercent(item.count / summary.total)}
                </span>
              </li>
            ))}
          </ul>
          {tip && (
            <div className="mt-5 border-t border-divider pt-4">
              <p className="text-body text-ink">{tip.text}</p>
              <Link
                to={tip.to}
                className="mt-2 inline-flex items-center gap-1.5 text-small font-semibold text-brand-strong hover:underline"
              >
                {tip.cta}
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          )}
        </>
      )}
    </Panel>
  )
}
