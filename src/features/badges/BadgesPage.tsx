import { Medal, QrCode } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '@/app/router/paths'
import { ButtonLink, EmptyState, ErrorState, PageHeader, Panel, SkeletonRows, Switch, Tag, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { usePlaces, useSetPlaceBadge } from '@/data/hooks/use-places'
import type { Stop } from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { plural } from '@/lib/format'

/**
 * Las insignias de los lugares (F6): cada lugar con `has_badge` tiene su QR, que el turista escanea
 * en el local. La insignia la activa el equipo con `places.manage`; el comercio la paga cada mes en
 * su estado de cuenta.
 */
export function BadgesPage() {
  useDocumentTitle('Insignias')
  const { isAdmin, can } = useSession()
  const managesPlaces = can('places.manage')
  const places = usePlaces()
  const setBadge = useSetPlaceBadge()
  const toast = useToast()

  const all = places.data ?? []
  const withBadge = all.filter((stop) => stop.hasBadge)
  // El equipo ve todos los lugares: aquí sólo los que dan insignia; los demás se activan en cada lugar.
  const shown = isAdmin ? withBadge : all

  const toggle = (stop: Stop, hasBadge: boolean) =>
    setBadge.mutate(
      { stopId: stop.id, hasBadge },
      {
        onSuccess: () => toast({ title: hasBadge ? `${stop.name} da insignia` : `${stop.name} ya no da insignia` }),
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    )

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Insignias"
        description={
          isAdmin
            ? 'Los lugares que dan insignia. Se activa desde la página de cada lugar ("Da insignia"); al comercio se le cobra cada mes en su estado de cuenta.'
            : 'El turista que escanea el QR de un lugar con insignia, estando a menos de 50 metros, gana una. Quien colecciona insignias elige los lugares que las dan.'
        }
      />

      <Panel
        title={isAdmin ? 'Lugares con insignia' : 'La insignia de cada lugar'}
        description={
          places.data
            ? isAdmin
              ? plural(withBadge.length, 'lugar da insignia', 'lugares dan insignia')
              : "La activa el equipo de K'Plan y se cobra cada mes en tu estado de cuenta, junto con los cupones que validas."
            : undefined
        }
        bodyClassName="p-0"
      >
        {places.isPending ? (
          <SkeletonRows rows={3} className="p-5" />
        ) : places.isError ? (
          <ErrorState error={places.error} onRetry={() => void places.refetch()} className="py-8" />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={<Medal size={20} />}
            title={isAdmin ? 'Ningún lugar da insignia todavía' : 'Todavía no tienes lugares'}
            action={<ButtonLink to={paths.places}>{isAdmin ? 'Ir a Lugares' : 'Ir a tus lugares'}</ButtonLink>}
            className="py-10"
          >
            {isAdmin ? 'Activa la insignia desde la página de un lugar.' : 'Cuando tengas un lugar, aquí ves si da insignia y su código QR.'}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-divider">
            {shown.map((stop) => (
              <li key={stop.id} className="flex flex-wrap items-center gap-4 px-5 py-4 sm:flex-nowrap">
                <span
                  className={
                    stop.hasBadge
                      ? 'flex size-10 shrink-0 items-center justify-center rounded-full bg-badge text-ink'
                      : 'flex size-10 shrink-0 items-center justify-center rounded-full bg-paper text-muted'
                  }
                >
                  <Medal size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body font-semibold text-ink">{stop.name}</p>
                  <p className="text-small text-muted">
                    {stop.hasBadge
                      ? `Da una insignia de ${stop.category}${isAdmin ? ` · ${stop.city}${stop.owner ? ` · ${stop.owner.name}` : ''}` : ''}`
                      : "No da insignia: pídele al equipo de K'Plan que la active."}
                  </p>
                </div>
                {stop.hasBadge && (
                  <Link
                    to={`${paths.place(stop.id)}?seccion=qr`}
                    className="inline-flex items-center gap-1.5 text-small font-semibold text-brand-strong hover:underline"
                  >
                    <QrCode size={15} aria-hidden="true" />
                    Ver su QR
                  </Link>
                )}
                {managesPlaces ? (
                  <Switch label="Da insignia" checked={stop.hasBadge} disabled={setBadge.isPending} onChange={(checked) => toggle(stop, checked)} />
                ) : (
                  stop.hasBadge && <Tag tone="badge">Da insignia</Tag>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
