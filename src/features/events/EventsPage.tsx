import { CalendarHeart, CopyPlus, Eye, EyeOff, MapPin, MoreHorizontal, Pencil, Plus, Search, Star, XCircle } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { Button, EmptyState, ErrorState, IconButton, Input, Menu, MenuItem, PageHeader, SkeletonRows, Tabs, Tag, useToast, type TagTone } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useEvents, useFeatureEvent, useShowEvent } from '@/data/hooks/use-events'
import { useOwnCity } from '@/data/hooks/use-own-city'
import { coverUrl, EVENT_STATUS_LABELS, isEditableEvent, type CulturalEvent, type EventStatus } from '@/data/models'
import type { EventFilters } from '@/data/repositories/events.repository'
import { useSession } from '@/features/auth/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useNow } from '@/hooks/use-now'
import { cn } from '@/lib/cn'
import { weekdayIndex } from '@/lib/dates'
import { formatDateSpan, formatDayMonth, formatMoney, MONTHS_SHORT, WEEKDAYS_SHORT } from '@/lib/format'
import { CancelEventDialog, CloneEventDialog, HideEventDialog } from './components/EventDialogs'
import { EventDrawer } from './components/EventDrawer'

type Section = 'proximos' | 'terminados' | 'cancelados'

const STATUS_TONES: Record<EventStatus, TagTone> = {
  scheduled: 'planned',
  ongoing: 'confirmed',
  finished: 'neutral',
  cancelled: 'danger',
}

function DateBlock({ date, past }: { date: string; past: boolean }) {
  return (
    <div className={cn('flex w-14 shrink-0 flex-col items-center rounded-kp border py-1.5 leading-none', past ? 'border-divider text-muted' : 'border-ink/20 text-ink')}>
      <span className="text-caption font-semibold tracking-label uppercase">{MONTHS_SHORT[Number(date.slice(5, 7)) - 1]}</span>
      <span className="mt-1 text-heading font-bold tabular-nums">{Number(date.slice(8))}</span>
      <span className="mt-0.5 text-[10px] text-muted uppercase">{WEEKDAYS_SHORT[weekdayIndex(date)]}</span>
    </div>
  )
}

/** Quién programa eventos: una institución o una alcaldía verificada, o el equipo con `content.moderate`. */
function useEventAccess() {
  const { user, organization, can } = useSession()
  const moderator = can('content.moderate')
  const organizes = organization?.status === 'active' && (user.organizationRef?.kind === 'institution' || user.organizationRef?.kind === 'municipality')
  return { moderator, canCreate: moderator || organizes }
}

export function EventsPage() {
  useDocumentTitle('Eventos')
  const { isAdmin, organization } = useSession()
  const { moderator, canCreate } = useEventAccess()
  const { today } = useNow()
  const toast = useToast()
  const [section, setSection] = useState<Section>('proximos')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search.trim())
  const [editing, setEditing] = useState<CulturalEvent | 'new' | null>(null)
  const [cancelling, setCancelling] = useState<CulturalEvent | null>(null)
  const [cloning, setCloning] = useState<CulturalEvent | null>(null)
  const [hiding, setHiding] = useState<CulturalEvent | null>(null)
  const ownCity = useOwnCity(isAdmin ? null : organization)

  const filters: EventFilters = {
    ...(section === 'proximos' ? { fromDate: today } : { status: section === 'terminados' ? 'finished' : 'cancelled' }),
    ...(deferredSearch ? { search: deferredSearch } : {}),
  }
  const events = useEvents(filters)
  const feature = useFeatureEvent()
  const show = useShowEvent()

  const shown = section === 'proximos' ? [...(events.data ?? [])].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.startTime.localeCompare(b.startTime)) : (events.data ?? [])

  const onFeature = (event: CulturalEvent) =>
    feature.mutate(
      { id: event.id, featured: !event.featured },
      {
        onSuccess: (saved) => toast({ title: saved.featured ? 'Destacado en el inicio de la app' : 'Ya no está destacado' }),
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    )

  const onShow = (event: CulturalEvent) =>
    show.mutate(event.id, {
      onSuccess: () => toast({ title: 'Evento visible otra vez en la app' }),
      onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
    })

  const description = isAdmin
    ? "Todos los eventos de la agenda. Programa los especiales de K'Plan, destaca los que valen la pena y oculta lo que no debe estar."
    : 'Talleres, funciones, ferias y fiestas que programas. Salen en la agenda de la app según sus fechas.'

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Eventos"
        description={description}
        actions={
          canCreate && (
            <Button icon={<Plus size={16} />} onClick={() => setEditing('new')}>
              {isAdmin ? 'Evento especial' : 'Programar evento'}
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <Tabs
          label="Eventos"
          value={section}
          onChange={setSection}
          items={[
            { value: 'proximos', label: 'Próximos y en curso' },
            { value: 'terminados', label: 'Terminados' },
            { value: 'cancelados', label: 'Cancelados' },
          ]}
          className="flex-1"
        />
        <Input
          aria-label="Buscar por nombre"
          placeholder="Buscar por nombre"
          leading={<Search size={15} aria-hidden="true" />}
          value={search}
          onChange={(change) => setSearch(change.target.value)}
          className="w-64"
        />
      </div>

      {events.isPending ? (
        <SkeletonRows rows={4} />
      ) : events.isError ? (
        <ErrorState error={events.error} onRetry={() => void events.refetch()} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<CalendarHeart size={20} />}
          title={deferredSearch ? 'Ningún evento se llama así' : section === 'proximos' ? 'No hay eventos próximos' : section === 'terminados' ? 'Todavía no terminó ningún evento' : 'No hay eventos cancelados'}
          action={
            section === 'proximos' &&
            canCreate &&
            !deferredSearch && (
              <Button icon={<Plus size={16} />} onClick={() => setEditing('new')}>
                Programar un evento
              </Button>
            )
          }
        >
          {section === 'proximos' && !deferredSearch && 'Un evento le da al turista una razón para visitar tu ciudad ese día.'}
        </EmptyState>
      ) : (
        <ul className="min-w-0 divide-y divide-divider rounded-panel border border-divider bg-surface">
          {shown.map((event) => {
            const editable = isEditableEvent(event)
            const cover = coverUrl(event.images)
            return (
              <li key={event.id} className={cn('grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-4 p-4 sm:flex sm:flex-nowrap', event.hidden && 'bg-canvas/60')}>
                <DateBlock date={event.startDate} past={!editable} />
                {cover ? (
                  <img src={cover} alt="" loading="lazy" className="hidden size-16 shrink-0 rounded-sm bg-placeholder object-cover md:block" />
                ) : (
                  <span className="hidden size-16 shrink-0 items-center justify-center rounded-sm bg-placeholder text-muted md:flex">
                    <CalendarHeart size={18} aria-hidden="true" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-body font-semibold text-ink">{event.name}</p>
                    <Tag tone="outline">{event.category.label}</Tag>
                    <Tag tone={STATUS_TONES[event.status]}>{EVENT_STATUS_LABELS[event.status]}</Tag>
                    {event.featured && (
                      <Tag tone="ink" icon={<Star size={11} fill="currentColor" strokeWidth={0} aria-hidden="true" />}>
                        Destacado
                      </Tag>
                    )}
                    {event.hidden && <Tag tone="neutral">Oculto por el equipo</Tag>}
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-small text-muted">
                    <span>{event.startDate === event.endDate ? formatDayMonth(event.startDate) : formatDateSpan(event.startDate, event.endDate)}</span>
                    <span className="tabular-nums">
                      {event.startTime} – {event.endTime}
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <MapPin size={13} aria-hidden="true" />
                      <span className="truncate">
                        {event.venue}, {event.city}
                      </span>
                    </span>
                    <span>{event.entryPrice === 0 ? 'Entrada libre' : formatMoney(event.entryPrice)}</span>
                  </p>
                  {event.status === 'cancelled' && event.cancellationReason && <p className="mt-0.5 text-caption text-danger">Cancelado: {event.cancellationReason}</p>}
                  {event.hidden && event.hiddenReason && <p className="mt-0.5 text-caption text-muted">Motivo para ocultarlo: {event.hiddenReason}</p>}
                  {isAdmin && <p className="mt-0.5 text-caption text-hint">Organiza: {event.organizer.name}</p>}
                </div>
                <div className="col-span-full flex shrink-0 justify-end gap-1">
                  {editable && <IconButton label="Corregir evento" icon={<Pencil size={16} />} onClick={() => setEditing(event)} />}
                  <Menu trigger={(props) => <IconButton {...props} label={`Más acciones de ${event.name}`} icon={<MoreHorizontal size={16} />} />}>
                    {(close) => (
                      <>
                        {canCreate && (
                          <MenuItem
                            icon={<CopyPlus size={16} />}
                            onSelect={() => {
                              close()
                              setCloning(event)
                            }}
                          >
                            Programar otra vez
                          </MenuItem>
                        )}
                        {moderator && editable && (
                          <MenuItem
                            icon={<Star size={16} />}
                            onSelect={() => {
                              close()
                              onFeature(event)
                            }}
                          >
                            {event.featured ? 'Quitar de destacados' : 'Destacar en la app'}
                          </MenuItem>
                        )}
                        {moderator &&
                          (event.hidden ? (
                            <MenuItem
                              icon={<Eye size={16} />}
                              onSelect={() => {
                                close()
                                onShow(event)
                              }}
                            >
                              Mostrar en la app
                            </MenuItem>
                          ) : (
                            <MenuItem
                              icon={<EyeOff size={16} />}
                              onSelect={() => {
                                close()
                                setHiding(event)
                              }}
                            >
                              Ocultar de la app
                            </MenuItem>
                          ))}
                        {editable && (
                          <MenuItem
                            icon={<XCircle size={16} />}
                            tone="danger"
                            onSelect={() => {
                              close()
                              setCancelling(event)
                            }}
                          >
                            Cancelar evento
                          </MenuItem>
                        )}
                      </>
                    )}
                  </Menu>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <EventDrawer
        open={editing !== null}
        event={editing === 'new' ? null : editing}
        defaultCityId={ownCity.city?.id ?? ''}
        moderator={moderator}
        onClose={() => setEditing(null)}
      />
      <CancelEventDialog event={cancelling} onClose={() => setCancelling(null)} />
      <CloneEventDialog event={cloning} onClose={() => setCloning(null)} />
      <HideEventDialog event={hiding} onClose={() => setHiding(null)} />
    </div>
  )
}
