import { Medal, Pencil, Plus, TicketPercent, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Button, ConfirmDialog, EmptyState, ErrorState, Field, IconButton, PageHeader, SegmentedControl, SkeletonRows, Tabs, Tag, Textarea, useToast, type TagTone } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useCampaigns, useWithdrawCampaign } from '@/data/hooks/use-coupons'
import { COUPON_CAMPAIGN_STATUS_LABELS, MAX_ACTIVE_CAMPAIGNS, type CouponCampaign, type CouponCampaignStatus } from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatDate, plural } from '@/lib/format'
import { CouponDrawer } from './components/CouponDrawer'
import { RedemptionsTable } from './components/RedemptionsTable'

type Section = 'campanas' | 'entregados'
type Filter = 'all' | CouponCampaignStatus

const TONES: Record<CouponCampaignStatus, TagTone> = { active: 'confirmed', sold_out: 'planned', withdrawn: 'neutral', expired: 'neutral' }

const FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'En la tienda' },
  { value: 'sold_out', label: 'Agotadas' },
  { value: 'withdrawn', label: 'Retiradas' },
  { value: 'expired', label: 'Vencidas' },
] as const

/**
 * Las campañas de cupones (F6): el comercio publica hasta tres a la vez y valida los códigos en el
 * mostrador; el equipo con `content.moderate` ve todas y retira las que no deben estar.
 */
export function CouponsPage() {
  useDocumentTitle('Cupones')
  const { isAdmin } = useSession()
  const [section, setSection] = useState<Section>('campanas')
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<CouponCampaign | 'new' | null>(null)
  const [withdrawing, setWithdrawing] = useState<CouponCampaign | null>(null)
  const [reason, setReason] = useState('')
  const campaigns = useCampaigns()
  const withdraw = useWithdrawCampaign()
  const toast = useToast()

  const all = campaigns.data ?? []
  const active = all.filter((campaign) => campaign.status === 'active').length
  const full = active >= MAX_ACTIVE_CAMPAIGNS
  const shown = filter === 'all' ? all : all.filter((campaign) => campaign.status === filter)

  const closeWithdraw = () => {
    setWithdrawing(null)
    setReason('')
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cupones"
        description={
          isAdmin
            ? 'Las campañas de cupones de los comercios. Los turistas las canjean con las insignias que ganan; retira las que no deben estar en la tienda.'
            : `Los turistas canjean tus cupones con las insignias que ganan en la app y te muestran un código. Tienes hasta ${MAX_ACTIVE_CAMPAIGNS} cupones en la tienda a la vez; cada cupón que validas se suma a tu estado de cuenta del mes.`
        }
        actions={
          !isAdmin && (
            <Button icon={<Plus size={16} />} disabled={full} onClick={() => setEditing('new')}>
              Nuevo cupón
            </Button>
          )
        }
      />
      {!isAdmin && campaigns.data && (
        <p className="text-small text-muted">
          {full
            ? `Ya tienes ${MAX_ACTIVE_CAMPAIGNS} cupones en la tienda: retira uno o espera a que se agote o venza para publicar otro.`
            : `${active} de ${MAX_ACTIVE_CAMPAIGNS} cupones en la tienda.`}
        </p>
      )}

      <Tabs
        label="Cupones"
        value={section}
        onChange={setSection}
        items={[
          { value: 'campanas', label: 'Campañas', count: campaigns.data?.length },
          { value: 'entregados', label: 'Cupones entregados' },
        ]}
      />

      {section === 'entregados' ? (
        <RedemptionsTable canValidate={!isAdmin} />
      ) : (
        <>
          <SegmentedControl label="Filtrar campañas" value={filter} options={FILTERS} onChange={setFilter} size="sm" className="self-start" />
          {campaigns.isPending ? (
            <SkeletonRows rows={4} />
          ) : campaigns.isError ? (
            <ErrorState error={campaigns.error} onRetry={() => void campaigns.refetch()} />
          ) : shown.length === 0 ? (
            <EmptyState
              icon={<TicketPercent size={20} />}
              title={all.length === 0 ? (isAdmin ? 'Ningún comercio ha publicado cupones' : 'Todavía no tienes cupones') : 'No hay campañas con este filtro'}
              action={
                !isAdmin &&
                all.length === 0 && (
                  <Button icon={<Plus size={16} />} onClick={() => setEditing('new')}>
                    Publicar el primero
                  </Button>
                )
              }
            >
              {!isAdmin && all.length === 0 && 'Un fresco gratis o un descuento convence a los turistas que juntan insignias.'}
            </EmptyState>
          ) : (
            <ul className="divide-y divide-divider rounded-kp border border-divider bg-surface">
              {shown.map((campaign) => (
                <li key={campaign.id} className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap">
                  {campaign.image?.url ? (
                    <img src={campaign.image.url} alt="" loading="lazy" className="size-16 shrink-0 rounded-sm bg-placeholder object-cover" />
                  ) : (
                    <span className="flex size-16 shrink-0 items-center justify-center rounded-sm bg-placeholder text-muted">
                      <TicketPercent size={18} aria-hidden="true" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-body font-semibold text-ink">{campaign.title}</p>
                      <Tag tone="outline">{campaign.benefit.label}</Tag>
                      <Tag tone={TONES[campaign.status]}>{COUPON_CAMPAIGN_STATUS_LABELS[campaign.status]}</Tag>
                    </div>
                    <p className="mt-0.5 truncate text-small text-muted">
                      {isAdmin && `${campaign.business.name} · ${campaign.business.city} · `}
                      {campaign.status === 'withdrawn' && campaign.withdrawnAt
                        ? `Retirada el ${formatDate(campaign.withdrawnAt.slice(0, 10))}${campaign.withdrawnReason ? `: ${campaign.withdrawnReason}` : ''}`
                        : `Hasta el ${formatDate(campaign.expiresAt.slice(0, 10))}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-small font-semibold text-ink tabular-nums" title="Lo que cuesta en la app">
                    <Medal size={15} className="text-badge-deep" aria-hidden="true" />
                    {plural(campaign.costBadges, 'insignia', 'insignias')}
                  </div>
                  <div className="w-40 text-right text-small text-muted tabular-nums">
                    <span className="font-semibold text-ink">{campaign.stockDelivered}</span> de {campaign.stockTotal} entregados
                    <br />
                    <span className="font-semibold text-ink">{campaign.consumed}</span> {campaign.consumed === 1 ? 'usado' : 'usados'}
                  </div>
                  <div className="flex shrink-0">
                    {!isAdmin && campaign.status === 'active' && (
                      <IconButton label="Corregir cupón" icon={<Pencil size={16} />} onClick={() => setEditing(campaign)} />
                    )}
                    {campaign.status === 'active' && (
                      <IconButton label="Retirar cupón" icon={<XCircle size={16} />} tone="danger" onClick={() => setWithdrawing(campaign)} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <CouponDrawer open={editing !== null} campaign={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={withdrawing !== null}
        title={`¿Retirar ${withdrawing?.title ?? 'el cupón'}?`}
        confirmLabel="Retirar de la tienda"
        loading={withdraw.isPending}
        onClose={closeWithdraw}
        onConfirm={() =>
          withdrawing &&
          withdraw.mutate(
            { id: withdrawing.id, reason },
            {
              onSuccess: () => {
                toast({ title: 'Cupón retirado', description: 'Los turistas que ya lo canjearon lo pueden usar hasta su fecha.' })
                closeWithdraw()
              },
              onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
            },
          )
        }
      >
        <div className="flex flex-col gap-4">
          <p>Sale de la tienda de la app. Los cupones que ya se entregaron siguen valiendo hasta su fecha límite.</p>
          <Field label="Motivo" optional>
            {(control) => <Textarea {...control} rows={3} maxLength={500} value={reason} onChange={(change) => setReason(change.target.value)} />}
          </Field>
        </div>
      </ConfirmDialog>
    </div>
  )
}
