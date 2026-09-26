import { Medal, Sparkle } from 'lucide-react'
import { Button, Tag } from '@/components/ui'
import { CAMPAIGN_STATUS_LABELS, type BadgeCampaign } from '@/data/models'
import { cn } from '@/lib/cn'
import { monthKey } from '@/lib/dates'
import { formatDayMonth, formatMoney, formatMonth, formatNumber } from '@/lib/format'

const STATUS_TONES = { scheduled: 'planned', active: 'badge', finished: 'neutral', cancelled: 'outline' } as const

interface CampaignCardProps {
  campaign: BadgeCampaign
  placeName: string
  ownerName?: string
  onCancel?: () => void
}

export function CampaignCard({ campaign, placeName, ownerName, onCancel }: CampaignCardProps) {
  const progress = campaign.badgeBudget ? campaign.extraAwarded / campaign.badgeBudget : 0
  const active = campaign.status === 'active'

  return (
    <article
      className={cn(
        'flex flex-col gap-4 rounded-kp border p-5',
        active ? 'border-badge bg-surface shadow-[inset_0_4px_0_var(--color-badge)]' : 'border-divider bg-surface',
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'flex size-12 shrink-0 items-center justify-center rounded-full text-title font-bold tabular-nums',
              active || campaign.status === 'scheduled' ? 'bg-badge text-ink' : 'bg-paper text-muted',
            )}
          >
            ×{campaign.multiplier}
          </span>
          <div>
            <p className="text-lead font-semibold text-ink">{placeName}</p>
            <p className="text-small text-muted">
              {ownerName && `${ownerName} · `}
              {formatDayMonth(campaign.startDate)} – {formatDayMonth(campaign.endDate)}
            </p>
          </div>
        </div>
        <Tag tone={STATUS_TONES[campaign.status]}>{CAMPAIGN_STATUS_LABELS[campaign.status]}</Tag>
      </header>

      {campaign.status !== 'cancelled' && (
        <div>
          <div className="flex items-baseline justify-between text-small">
            <span className="flex items-center gap-1.5 text-ink">
              <Medal size={14} className="text-badge-deep" aria-hidden="true" />
              <strong className="font-semibold tabular-nums">{formatNumber(campaign.extraAwarded)}</strong>
              <span className="text-muted">de {formatNumber(campaign.badgeBudget)} insignias extra entregadas</span>
            </span>
          </div>
          <div
            className="mt-2 h-2.5 overflow-hidden rounded-full bg-paper"
            role="progressbar"
            aria-valuenow={campaign.extraAwarded}
            aria-valuemin={0}
            aria-valuemax={campaign.badgeBudget}
            aria-label="Insignias extra entregadas"
          >
            <div className="h-full rounded-full bg-badge transition-[width] duration-700 ease-out-expo" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 text-small text-muted">
        <span>
          {active ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-ink">
              <Sparkle size={14} className="text-badge-deep" aria-hidden="true" />
              Destacado en la app hasta el {formatDayMonth(campaign.endDate)}
            </span>
          ) : campaign.status === 'cancelled' ? (
            'Cancelada antes de empezar: no se cobró'
          ) : (
            `${formatMoney(campaign.price)} · en tu estado de cuenta de ${formatMonth(monthKey(campaign.createdAt))}`
          )}
        </span>
        {onCancel && campaign.status === 'scheduled' && (
          <Button variant="quiet" size="sm" onClick={onCancel}>
            Cancelar campaña
          </Button>
        )}
      </footer>
    </article>
  )
}
