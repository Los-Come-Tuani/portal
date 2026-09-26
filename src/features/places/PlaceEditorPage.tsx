import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Medal, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, useWatch, type FieldValues, type Path, type UseFormReturn } from 'react-hook-form'
import { Link, useBlocker, useParams, useSearchParams } from 'react-router'
import { paths } from '@/app/router/paths'
import { ConfirmDialog, ErrorState, Panel, SaveBar, Skeleton, Tabs, Tag, useToast } from '@/components/ui'
import { ApiError, errorMessage } from '@/data/api/errors'
import { usePlace, usePlaceProfile, usePosts, useUpdatePlace, useUpdatePlaceProfile } from '@/data/hooks/use-places'
import type { PlaceProfileInput, StopInput } from '@/data/models'
import { placeProfileInputSchema } from '@/data/schemas/profile.schema'
import { stopInputSchema } from '@/data/schemas/stop.schema'
import { useSession } from '@/features/auth/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatPercent } from '@/lib/format'
import { AppPreview } from './components/AppPreview'
import { PostsTab } from './components/PostsTab'
import { OfferingsForm, ServicesContactForm } from './components/ProfileForms'
import { QrPoster } from './components/QrPoster'
import { StopForm } from './components/StopForm'
import { profileToForm, stopToForm } from './forms'
import { completeness } from './lib/completeness'

type Section = 'ficha' | 'ofrecemos' | 'servicios' | 'novedades' | 'qr'

const SECTIONS: { value: Section; label: string }[] = [
  { value: 'ficha', label: 'Ficha en la app' },
  { value: 'ofrecemos', label: 'Qué ofrecemos' },
  { value: 'servicios', label: 'Servicios y contacto' },
  { value: 'novedades', label: 'Novedades' },
  { value: 'qr', label: 'Código QR' },
]

/** Los errores por campo que devuelve la API se pintan en el formulario. */
function applyFieldErrors<T extends FieldValues>(form: UseFormReturn<T>, error: unknown): boolean {
  if (!(error instanceof ApiError)) return false
  const entries = Object.entries(error.fieldErrors)
  entries.forEach(([field, message]) => form.setError(field as Path<T>, { message }))
  return entries.length > 0
}

export function PlaceEditorPage() {
  const { stopId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const section = (SECTIONS.find((item) => item.value === params.get('seccion'))?.value ?? 'ficha') as Section
  const setSection = (value: Section) =>
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (value === 'ficha') next.delete('seccion')
      else next.set('seccion', value)
      return next
    })

  const { isAdmin, organization } = useSession()
  const toast = useToast()
  const stop = usePlace(stopId)
  const profile = usePlaceProfile(stopId)
  const posts = usePosts(stopId)
  const updateStop = useUpdatePlace()
  const updateProfile = useUpdatePlaceProfile()
  const [saving, setSaving] = useState(false)
  useDocumentTitle(stop.data?.name ?? 'Lugar')

  const stopForm = useForm<StopInput>({ resolver: zodResolver(stopInputSchema) })
  const profileForm = useForm<PlaceProfileInput>({ resolver: zodResolver(placeProfileInputSchema) })
  const resetStop = stopForm.reset
  const resetProfile = profileForm.reset

  useEffect(() => {
    if (stop.data) resetStop(stopToForm(stop.data))
  }, [stop.data, resetStop])
  useEffect(() => {
    if (profile.data) resetProfile(profileToForm(profile.data))
  }, [profile.data, resetProfile])

  const stopDraft = useWatch({ control: stopForm.control }) as StopInput
  const profileDraft = useWatch({ control: profileForm.control }) as PlaceProfileInput
  const dirty = stopForm.formState.isDirty || profileForm.formState.isDirty

  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname)

  const save = async () => {
    setSaving(true)
    let failed = false
    try {
      if (stopForm.formState.isDirty) {
        await stopForm.handleSubmit(
          async (input) => {
            try {
              await updateStop.mutateAsync({ stopId, input })
            } catch (error) {
              failed = true
              if (!applyFieldErrors(stopForm, error)) toast({ title: errorMessage(error), tone: 'error' })
            }
          },
          () => {
            failed = true
            setSection('ficha')
          },
        )()
      }
      if (!failed && profileForm.formState.isDirty) {
        await profileForm.handleSubmit(
          async (input) => {
            try {
              await updateProfile.mutateAsync({ stopId, input })
            } catch (error) {
              failed = true
              if (!applyFieldErrors(profileForm, error)) toast({ title: errorMessage(error), tone: 'error' })
            }
          },
          (errors) => {
            failed = true
            setSection(errors.offerings ? 'ofrecemos' : 'servicios')
          },
        )()
      }
      if (failed) toast({ title: 'Revisa los campos marcados', tone: 'error' })
      else toast({ title: 'Cambios guardados', description: 'Así lo verán los turistas en la app.' })
    } finally {
      setSaving(false)
    }
  }

  if (stop.isError) return <ErrorState error={stop.error} onRetry={() => void stop.refetch()} />
  if (!stop.data || !stopDraft?.images) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-[32rem]" />
      </div>
    )
  }

  const place = stop.data
  const multiplePlaces = isAdmin || (organization?.stopIds.length ?? 0) > 1
  const score = completeness(place)
  const showPreview = section !== 'qr'

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        {multiplePlaces && (
          <Link
            to={paths.places}
            className="inline-flex items-center gap-1.5 self-start text-small font-semibold text-muted hover:text-ink"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            {isAdmin ? 'Lugares' : 'Mis lugares'}
          </Link>
        )}
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            <h1 className="text-headline font-bold tracking-tight text-ink">{place.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-small text-muted">
              <Tag tone="outline">{place.category}</Tag>
              <span>{place.city}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Star size={13} className="text-star" fill="currentColor" strokeWidth={0} aria-hidden="true" />
                {place.rating.toFixed(1)} ({place.reviewsCount} reseñas de turistas)
              </span>
              <span aria-hidden="true">·</span>
              {place.hasBadge ? (
                <Tag tone="badge" icon={<Medal size={12} aria-hidden="true" />}>
                  Da insignia
                </Tag>
              ) : (
                <Link to={paths.badges} className="font-semibold text-brand-strong hover:underline">
                  Activar insignia
                </Link>
              )}
            </div>
          </div>
          <div className="w-56">
            <div className="flex items-baseline justify-between text-small">
              <span className="text-muted">Ficha completa</span>
              <span className="font-semibold text-ink tabular-nums">{formatPercent(score)}</span>
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-paper"
              role="progressbar"
              aria-valuenow={Math.round(score * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Ficha completa"
            >
              <div className="h-full rounded-full bg-confirmed transition-[width] duration-500" style={{ width: `${score * 100}%` }} />
            </div>
          </div>
        </div>
      </header>

      <Tabs label="Secciones del lugar" value={section} onChange={setSection} items={SECTIONS} />

      <div className={showPreview ? 'grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_20.5rem]' : ''}>
        <Panel className="min-w-0">
          {section === 'ficha' && <StopForm form={stopForm} />}
          {section === 'ofrecemos' && (profile.data ? <OfferingsForm form={profileForm} /> : <Skeleton className="h-64" />)}
          {section === 'servicios' &&
            (profile.data ? <ServicesContactForm form={profileForm} /> : <Skeleton className="h-64" />)}
          {section === 'novedades' && <PostsTab stopId={stopId} />}
          {section === 'qr' && <QrPoster stop={place} />}
        </Panel>

        {showPreview && (
          <div className="hidden xl:sticky xl:top-24 xl:block">
            <AppPreview
              stop={stopDraft}
              profile={profile.data ? profileDraft : undefined}
              hasBadge={place.hasBadge}
              rating={place.rating}
              reviewsCount={place.reviewsCount}
              latestPost={posts.data?.find((post) => post.status === 'published')}
            />
          </div>
        )}
      </div>

      <SaveBar
        visible={dirty}
        saving={saving}
        onSave={() => void save()}
        onDiscard={() => {
          stopForm.reset()
          profileForm.reset()
        }}
      />

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Tienes cambios sin guardar"
        confirmLabel="Salir sin guardar"
        onClose={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
      >
        Si sales ahora, se pierden los cambios de la ficha.
      </ConfirmDialog>
    </div>
  )
}
