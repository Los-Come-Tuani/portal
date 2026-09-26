import { Medal, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button, ConfirmDialog, EmptyState, ErrorState, PageHeader, Panel, SkeletonRows, Tag, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useActivateBadge, useBadgeActivations, useBadgeCampaigns, useCancelActivation, useCancelCampaign } from '@/data/hooks/use-badges'
import { usePricing } from '@/data/hooks/use-billing'
import { useOrganizations } from '@/data/hooks/use-organizations'
import { usePlaces } from '@/data/hooks/use-places'
import type { BadgeActivation, BadgeCampaign, Stop } from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatDate, formatMoney } from '@/lib/format'
import { CampaignCard } from './components/CampaignCard'
import { CampaignDrawer } from './components/CampaignDrawer'

type Pending =
  | { kind: 'activate'; stop: Stop }
  | { kind: 'cancel-activation'; activation: BadgeActivation; stop: Stop }
  | { kind: 'cancel-campaign'; campaign: BadgeCampaign }

export function BadgesPage() {
  useDocumentTitle('Insignias')
  const { isAdmin, organizationId } = useSession()
  const places = usePlaces(isAdmin ? {} : { organizationId })
  const activations = useBadgeActivations(organizationId)
  const campaigns = useBadgeCampaigns(organizationId)
  const organizations = useOrganizations({}, isAdmin)
  const pricing = usePricing()
  const activate = useActivateBadge()
  const cancelActivation = useCancelActivation()
  const cancelCampaign = useCancelCampaign()
  const toast = useToast()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)

  const placeName = (stopId: string) => places.data?.find((stop) => stop.id === stopId)?.name ?? stopId
  const ownerName = (organizationIdOf: string) => organizations.data?.find((item) => item.id === organizationIdOf)?.name
  const withBadge = (places.data ?? []).filter((stop) => stop.hasBadge)
  const current = (campaigns.data ?? []).filter((campaign) => campaign.status === 'active' || campaign.status === 'scheduled')
  const history = (campaigns.data ?? []).filter((campaign) => campaign.status === 'finished' || campaign.status === 'cancelled')
  const monthly = pricing.data ? formatMoney(pricing.data.badgeActivationMonthly) : ''

  const confirm = () => {
    if (!pending) return
    const done = (title: string) => () => {
      setPending(null)
      toast({ title })
    }
    const failed = (error: unknown) => toast({ title: errorMessage(error), tone: 'error' })
    if (pending.kind === 'activate') {
      activate.mutate(pending.stop.id, { onSuccess: done(`${pending.stop.name} ya da insignia`), onError: failed })
    } else if (pending.kind === 'cancel-activation') {
      cancelActivation.mutate(pending.activation.id, { onSuccess: done('Insignia desactivada'), onError: failed })
    } else {
      cancelCampaign.mutate(pending.campaign.id, { onSuccess: done('Campaña cancelada'), onError: failed })
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Insignias"
        description={
          isAdmin
            ? 'Las insignias activadas y las campañas que compraron negocios y alcaldías.'
            : 'Cada turista que escanea el QR de un lugar con insignia gana una. Quien colecciona insignias elige lugares que las den, y una campaña da todavía más.'
        }
        actions={
          !isAdmin && (
            <Button icon={<Plus size={16} />} onClick={() => setDrawerOpen(true)} disabled={withBadge.length === 0}>
              Nueva campaña
            </Button>
          )
        }
      />

      <section className="flex flex-col gap-4" aria-labelledby="campaigns-title">
        <h2 id="campaigns-title" className="text-title font-semibold text-ink">
          Campañas de insignias extra
        </h2>
        {campaigns.isPending ? (
          <SkeletonRows rows={2} />
        ) : campaigns.isError ? (
          <ErrorState error={campaigns.error} onRetry={() => void campaigns.refetch()} />
        ) : current.length === 0 ? (
          <EmptyState
            icon={<Medal size={20} />}
            title={isAdmin ? 'No hay campañas activas' : 'No tienes campañas activas'}
            action={
              !isAdmin &&
              withBadge.length > 0 && (
                <Button icon={<Plus size={16} />} onClick={() => setDrawerOpen(true)}>
                  Lanzar una campaña
                </Button>
              )
            }
            className="rounded-kp border border-dashed border-outline"
          >
            {isAdmin
              ? 'Cuando una organización compre una campaña, aparece aquí.'
              : withBadge.length === 0
                ? 'Primero activa la insignia en uno de tus lugares: la campaña multiplica esa insignia.'
                : 'Con ×2, ×3 o ×5 insignias por visita, tu lugar sale destacado y los coleccionistas lo ponen en su ruta.'}
          </EmptyState>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {current.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                placeName={placeName(campaign.stopId)}
                ownerName={isAdmin ? ownerName(campaign.organizationId) : undefined}
                onCancel={() => setPending({ kind: 'cancel-campaign', campaign })}
              />
            ))}
          </div>
        )}
      </section>

      {!isAdmin && (
        <Panel
          title="Insignia de cada lugar"
          description={`Activar la insignia en un lugar cuesta ${monthly} al mes. Las del catálogo original de K'Plan no se cobran.`}
          bodyClassName="p-0"
        >
          {places.isPending || activations.isPending ? (
            <SkeletonRows rows={2} className="p-5" />
          ) : (
            <ul className="divide-y divide-divider">
              {(places.data ?? []).map((stop) => {
                const activation = activations.data?.find((item) => item.stopId === stop.id && item.status === 'active')
                return (
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
                          ? activation
                            ? `Da una insignia de ${stop.category} · activada el ${formatDate(activation.startedAt)} · ${formatMoney(activation.monthlyPrice)} al mes`
                            : `Da una insignia de ${stop.category} · incluida en el catálogo de K'Plan`
                          : 'No da insignia: los turistas que las coleccionan lo pasan por alto'}
                      </p>
                    </div>
                    {stop.hasBadge ? (
                      activation ? (
                        <Button variant="quiet" size="sm" onClick={() => setPending({ kind: 'cancel-activation', activation, stop })}>
                          Desactivar
                        </Button>
                      ) : (
                        <Tag tone="badge">Da insignia</Tag>
                      )
                    ) : (
                      <Button size="sm" onClick={() => setPending({ kind: 'activate', stop })}>
                        Activar insignia
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      )}

      {history.length > 0 && (
        <section className="flex flex-col gap-4" aria-labelledby="history-title">
          <h2 id="history-title" className="text-title font-semibold text-ink">
            Campañas anteriores
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {history.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                placeName={placeName(campaign.stopId)}
                ownerName={isAdmin ? ownerName(campaign.organizationId) : undefined}
              />
            ))}
          </div>
        </section>
      )}

      <CampaignDrawer open={drawerOpen} places={withBadge} onClose={() => setDrawerOpen(false)} />

      <ConfirmDialog
        open={pending !== null}
        tone={pending?.kind === 'activate' ? 'primary' : 'danger'}
        title={
          pending?.kind === 'activate'
            ? `Activar la insignia de ${pending.stop.name}`
            : pending?.kind === 'cancel-activation'
              ? `Desactivar la insignia de ${pending.stop.name}`
              : 'Cancelar la campaña'
        }
        confirmLabel={pending?.kind === 'activate' ? `Activar por ${monthly} al mes` : 'Sí, cancelar'}
        loading={activate.isPending || cancelActivation.isPending || cancelCampaign.isPending}
        onClose={() => setPending(null)}
        onConfirm={confirm}
      >
        {pending?.kind === 'activate' &&
          `Desde hoy, cada turista que escanee el QR de ${pending.stop.name} gana una insignia de ${pending.stop.category}. Se cobra ${monthly} al mes en tu estado de cuenta; puedes desactivarla cuando quieras.`}
        {pending?.kind === 'cancel-activation' &&
          'Los turistas dejan de ganar insignia en este lugar. El mes en curso ya está cobrado.'}
        {pending?.kind === 'cancel-campaign' && 'La campaña todavía no empieza, así que no se cobra.'}
      </ConfirmDialog>
    </div>
  )
}
