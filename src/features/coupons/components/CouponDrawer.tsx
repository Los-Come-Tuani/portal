import { zodResolver } from '@hookform/resolvers/zod'
import { Medal } from 'lucide-react'
import { useMemo } from 'react'
import { Controller, useForm, useWatch, type Path } from 'react-hook-form'
import { Button, Dialog, Field, Input, Select, Skeleton, Textarea, useToast } from '@/components/ui'
import { ApiError, errorMessage } from '@/data/api/errors'
import { useBenefitTypes, useSaveCampaign } from '@/data/hooks/use-coupons'
import type { BenefitType, CampaignInput, CouponCampaign } from '@/data/models'
import { campaignInputSchema } from '@/data/schemas/coupon.schema'
import { PhotoListField } from '@/features/places/components/PhotoListField'
import { useNow } from '@/hooks/use-now'
import { addDays } from '@/lib/dates'

interface CouponDrawerProps {
  open: boolean
  campaign: CouponCampaign | null
  onClose: () => void
}

export function CouponDrawer({ open, campaign, onClose }: CouponDrawerProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="sheet"
      title={campaign ? 'Corregir cupón' : 'Nuevo cupón'}
      description="El turista lo canjea con sus insignias en la app y te muestra un código al llegar."
    >
      <CampaignForm key={campaign?.id ?? 'new'} campaign={campaign} onDone={onClose} />
    </Dialog>
  )
}

const FORM_FIELDS: readonly Path<CampaignInput>[] = ['benefitType', 'title', 'description', 'terms', 'benefitAmount', 'costBadges', 'stockTotal', 'expiresOn', 'image']

function CampaignForm({ campaign, onDone }: { campaign: CouponCampaign | null; onDone: () => void }) {
  const types = useBenefitTypes()
  if (types.isError) return <p className="text-body text-danger">{errorMessage(types.error)}</p>
  if (!types.data) return <Skeleton className="h-[28rem]" />
  return <CampaignFields campaign={campaign} benefitTypes={types.data} onDone={onDone} />
}

function CampaignFields({ campaign, benefitTypes, onDone }: { campaign: CouponCampaign | null; benefitTypes: BenefitType[]; onDone: () => void }) {
  const save = useSaveCampaign()
  const toast = useToast()
  const { today } = useNow()
  const schema = useMemo(() => campaignInputSchema({ benefitTypes, today, delivered: campaign?.stockDelivered ?? 0 }), [benefitTypes, today, campaign])
  const {
    register,
    control,
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<CampaignInput>({
    resolver: zodResolver(schema),
    defaultValues: campaign
      ? {
          benefitType: campaign.benefit.type.code,
          title: campaign.title,
          description: campaign.description,
          terms: campaign.terms,
          benefitAmount: campaign.benefit.amount,
          costBadges: campaign.costBadges,
          stockTotal: campaign.stockTotal,
          expiresOn: campaign.expiresAt.slice(0, 10),
          image: campaign.image,
        }
      : {
          benefitType: benefitTypes[0]?.code ?? '',
          title: '',
          description: '',
          terms: '',
          benefitAmount: null,
          costBadges: 3,
          stockTotal: 50,
          expiresOn: addDays(today, 60),
          image: null,
        },
  })
  const typeCode = useWatch({ control, name: 'benefitType' })
  const type = benefitTypes.find((item) => item.code === typeCode)

  const submit = handleSubmit((input) =>
    save.mutate(
      { current: campaign, input: { ...input, benefitAmount: type?.requiresAmount ? input.benefitAmount : null }, benefitType: type },
      {
        onSuccess: (saved) => {
          toast({ title: campaign ? 'Cupón corregido' : `Publicaste ${saved.title}`, description: campaign ? undefined : 'Ya está en la tienda de la app.' })
          onDone()
        },
        onError: (error) => {
          if (error instanceof ApiError) {
            for (const [field, message] of Object.entries(error.fieldErrors)) {
              if ((FORM_FIELDS as readonly string[]).includes(field)) setError(field as Path<CampaignInput>, { message })
            }
          }
          toast({ title: error instanceof ApiError ? (Object.values(error.fieldErrors)[0] ?? errorMessage(error)) : errorMessage(error), tone: 'error' })
        },
      },
    ),
  )

  return (
    <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
      <Field label="Nombre del cupón" error={errors.title?.message} hint="Lo que ve el turista en la tienda: «10% en tu almuerzo», «Fresco gratis».">
        {(field) => <Input {...field} {...register('title')} />}
      </Field>
      {campaign ? (
        <p className="flex flex-wrap items-center gap-x-2 rounded-kp bg-paper px-4 py-3 text-small text-ink">
          <span className="font-semibold">{campaign.benefit.label}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Medal size={14} className="text-badge-deep" aria-hidden="true" />
            Cuesta {campaign.costBadges} {campaign.costBadges === 1 ? 'insignia' : 'insignias'}
          </span>
          <span className="text-muted">El beneficio y el costo no cambian después de publicarlo.</span>
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Qué da" error={errors.benefitType?.message}>
            {(field) => (
              <Select {...field} {...register('benefitType')}>
                {benefitTypes.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {type?.requiresAmount && (
            <Field label={type.isPercentage ? 'Porcentaje' : 'Monto'} error={errors.benefitAmount?.message}>
              {(field) => (
                <Input
                  {...field}
                  type="number"
                  min={1}
                  max={type.isPercentage ? 100 : undefined}
                  leading={type.isPercentage ? '%' : 'C$'}
                  {...register('benefitAmount', { setValueAs: (value) => (value === '' || value === null ? null : Number(value)) })}
                />
              )}
            </Field>
          )}
          <Field label="Cuesta" error={errors.costBadges?.message} hint="En insignias.">
            {(field) => <Input {...field} type="number" min={1} leading={<Medal size={15} aria-hidden="true" />} {...register('costBadges', { valueAsNumber: true })} />}
          </Field>
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Cupones"
          error={errors.stockTotal?.message}
          hint={campaign ? `Ya se entregaron ${campaign.stockDelivered}.` : 'Cuántos se pueden canjear.'}
        >
          {(field) => <Input {...field} type="number" min={campaign?.stockDelivered || 1} {...register('stockTotal', { valueAsNumber: true })} />}
        </Field>
        <Field label="Último día" error={errors.expiresOn?.message}>
          {(field) => <Input {...field} type="date" min={today} {...register('expiresOn')} />}
        </Field>
      </div>
      <Field label="Descripción" optional error={errors.description?.message}>
        {(field) => <Textarea {...field} rows={3} {...register('description')} />}
      </Field>
      <Field label="Condiciones" optional error={errors.terms?.message} hint="«Válido de lunes a viernes», «Uno por mesa».">
        {(field) => <Textarea {...field} rows={2} {...register('terms')} />}
      </Field>
      <Controller
        control={control}
        name="image"
        render={({ field, fieldState }) => (
          <PhotoListField
            kind="coupon-photo"
            label="Foto"
            max={1}
            value={field.value ? [field.value] : []}
            onChange={(photos) => field.onChange(photos[0] ?? null)}
            error={fieldState.error?.message}
          />
        )}
      />

      <div className="flex justify-end gap-2 border-t border-divider pt-5">
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.isPending}>
          {campaign ? 'Guardar cambios' : 'Publicar cupón'}
        </Button>
      </div>
    </form>
  )
}
