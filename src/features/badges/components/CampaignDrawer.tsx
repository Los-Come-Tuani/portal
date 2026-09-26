import { zodResolver } from '@hookform/resolvers/zod'
import { Medal } from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Button, Dialog, Field, Input, SegmentedControl, Select, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useCreateCampaign } from '@/data/hooks/use-badges'
import { usePricing } from '@/data/hooks/use-billing'
import { BADGE_MULTIPLIERS, type BadgeCampaignInput, type Stop } from '@/data/models'
import { campaignInputSchema, MAX_CAMPAIGN_DAYS } from '@/data/schemas/badges.schema'
import { cn } from '@/lib/cn'
import { addDays, diffDays, monthKey, todayISO } from '@/lib/dates'
import { formatDayMonth, formatMoney, formatMonth, formatNumber, plural } from '@/lib/format'

interface CampaignDrawerProps {
  open: boolean
  places: readonly Stop[]
  onClose: () => void
}

export function CampaignDrawer({ open, places, onClose }: CampaignDrawerProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="sheet"
      title="Nueva campaña de insignias"
      description="Durante esas fechas, cada visita confirmada con tu QR da más insignias y tu lugar sale destacado en la app."
    >
      <CampaignForm places={places} onDone={onClose} />
    </Dialog>
  )
}

/** Lo que gana el turista, dibujado: cambia en cuanto se elige ×2, ×3 o ×5. */
function MedalRow({ count, tone }: { count: number; tone: 'gold' | 'muted' }) {
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className={cn(
            'flex size-8 items-center justify-center rounded-full transition-transform duration-300 ease-out-expo',
            tone === 'gold' ? 'animate-rise bg-badge text-ink' : 'bg-medal-none/50 text-muted',
          )}
          style={{ animationDelay: `${index * 40}ms` }}
        >
          <Medal size={16} />
        </span>
      ))}
    </span>
  )
}

function CampaignForm({ places, onDone }: { places: readonly Stop[]; onDone: () => void }) {
  const create = useCreateCampaign()
  const pricing = usePricing()
  const toast = useToast()
  const today = todayISO()
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BadgeCampaignInput>({
    resolver: zodResolver(campaignInputSchema),
    defaultValues: {
      stopId: places[0]?.id ?? '',
      multiplier: 3,
      startDate: addDays(today, 1),
      endDate: addDays(today, 14),
      packId: pricing.data?.badgePacks[1]?.id ?? pricing.data?.badgePacks[0]?.id ?? '',
    },
  })
  const multiplier = useWatch({ control, name: 'multiplier' })
  const packId = useWatch({ control, name: 'packId' })
  const startDate = useWatch({ control, name: 'startDate' })
  const endDate = useWatch({ control, name: 'endDate' })
  const pack = pricing.data?.badgePacks.find((item) => item.id === packId)
  const people = pack ? Math.floor(pack.badges / (multiplier - 1)) : 0
  const days = startDate && endDate ? diffDays(startDate, endDate) + 1 : 0

  const submit = handleSubmit((input) =>
    create.mutate(input, {
      onSuccess: () => {
        toast({ title: 'Campaña comprada', description: `Empieza el ${formatDayMonth(input.startDate)}.` })
        onDone()
      },
      onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
    }),
  )

  return (
    <form className="flex flex-col gap-6" onSubmit={submit} noValidate>
      {places.length > 1 && (
        <Field label="Lugar" error={errors.stopId?.message}>
          {(field) => (
            <Select {...field} {...register('stopId')}>
              {places.map((stop) => (
                <option key={stop.id} value={stop.id}>
                  {stop.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}

      <div className="flex flex-col gap-3">
        <p className="text-small font-medium text-ink">Insignias por visita</p>
        <Controller
          control={control}
          name="multiplier"
          render={({ field }) => (
            <SegmentedControl
              label="Insignias por visita"
              value={field.value}
              onChange={field.onChange}
              options={BADGE_MULTIPLIERS.map((value) => ({ value, label: `×${value}` }))}
              className="self-start"
            />
          )}
        />
        <div className="grid gap-3 rounded-kp bg-paper p-4 sm:grid-cols-2">
          <div>
            <p className="text-caption font-semibold text-muted">Hoy gana</p>
            <div className="mt-2">
              <MedalRow count={1} tone="muted" />
            </div>
          </div>
          <div>
            <p className="text-caption font-semibold text-muted">Con la campaña gana</p>
            <div className="mt-2" key={multiplier}>
              <MedalRow count={multiplier} tone="gold" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Empieza" error={errors.startDate?.message}>
          {(field) => <Input {...field} type="date" min={today} {...register('startDate')} />}
        </Field>
        <Field label="Termina" error={errors.endDate?.message} hint={`Máximo ${MAX_CAMPAIGN_DAYS} días.`}>
          {(field) => <Input {...field} type="date" min={startDate} {...register('endDate')} />}
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-small font-medium text-ink">Insignias extra que compras</legend>
        <Controller
          control={control}
          name="packId"
          render={({ field }) => (
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Paquete de insignias">
              {pricing.data?.badgePacks.map((item) => {
                const selected = field.value === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => field.onChange(item.id)}
                    className={cn(
                      'flex flex-col items-start rounded-kp border p-3.5 text-left transition-colors duration-150',
                      selected ? 'border-ink bg-ink text-canvas' : 'border-outline bg-field text-ink hover:border-ink/40',
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-lead font-semibold tabular-nums">
                      <Medal size={16} className={selected ? 'text-badge' : 'text-badge-deep'} aria-hidden="true" />
                      {formatNumber(item.badges)}
                    </span>
                    <span className="mt-1 text-body font-semibold tabular-nums">{formatMoney(item.price)}</span>
                    <span className={cn('text-caption tabular-nums', selected ? 'text-canvas/70' : 'text-muted')}>
                      {formatMoney(item.price / item.badges)} por insignia
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        />
        {errors.packId && <p className="text-caption font-medium text-danger">{errors.packId.message}</p>}
      </fieldset>

      {pack && (
        <div className="rounded-kp border border-divider bg-surface p-4 text-body text-ink">
          <p>
            Cada persona que escanee tu QR gana <strong>{plural(multiplier, 'insignia', 'insignias')}</strong> en vez de 1.
            Tus {formatNumber(pack.badges)} insignias extra alcanzan para unas <strong>{formatPeople(people)}</strong>
            {days > 0 && ` en ${plural(days, 'día', 'días')}`}.
          </p>
          <p className="mt-2 text-small text-muted">
            Se suma {formatMoney(pack.price)} a tu estado de cuenta de {formatMonth(monthKey(today))}. Si la cancelas antes de
            que empiece, no se cobra.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-divider pt-5">
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={create.isPending} disabled={!pack}>
          Comprar campaña
        </Button>
      </div>
    </form>
  )
}

function formatPeople(count: number) {
  return plural(count, 'persona', 'personas')
}
