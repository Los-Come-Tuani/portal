import { CalendarHeart, Eye, EyeOff, MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  IconButton,
  PageHeader,
  Select,
  SkeletonRows,
  Tabs,
  Tag,
  useToast,
} from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useDeleteEvent, useEvents, useModerateEvent } from '@/data/hooks/use-events'
import { useOrganizations } from '@/data/hooks/use-organizations'
import { usePlaces } from '@/data/hooks/use-places'
import type { EventItem } from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useNow } from '@/hooks/use-now'
import { cn } from '@/lib/cn'
import { formatMoney, MONTHS_SHORT, WEEKDAYS_SHORT } from '@/lib/format'
import { weekdayIndex } from '@/lib/dates'
import { EventDrawer } from './components/EventDrawer'

function DateBlock({ date, past }: { date: string; past: boolean }) {
  return (
    <div
      className={cn(
        'flex w-14 shrink-0 flex-col items-center rounded-kp border py-1.5 leading-none',
        past ? 'border-divider text-muted' : 'border-ink/20 text-ink',
      )}
    >
      <span className="text-caption font-semibold tracking-label uppercase">{MONTHS_SHORT[Number(date.slice(5, 7)) - 1]}</span>
      <span className="mt-1 text-heading font-bold tabular-nums">{Number(date.slice(8))}</span>
      <span className="mt-0.5 text-[10px] text-muted uppercase">{WEEKDAYS_SHORT[weekdayIndex(date)]}</span>
    </div>
  )
}

export function EventsPage() {
  useDocumentTitle('Eventos')
  const { isAdmin, role, organization, organizationId } = useSession()
  const { today } = useNow()
  const [section, setSection] = useState<'proximos' | 'pasados'>('proximos')
  const [organizer, setOrganizer] = useState('')
  const [editing, setEditing] = useState<EventItem | 'new' | null>(null)
  const [deleting, setDeleting] = useState<EventItem | null>(null)
  const events = useEvents({ organizerId: isAdmin ? organizer || undefined : organizationId })
  const places = usePlaces({ organizationId }, !isAdmin)
  const organizations = useOrganizations({}, isAdmin)
  const remove = useDeleteEvent()
  const moderate = useModerateEvent()
  const toast = useToast()

  const all = events.data ?? []
  const upcoming = all.filter((event) => event.date >= today)
  const past = all.filter((event) => event.date < today).reverse()
  const shown = section === 'proximos' ? upcoming : past
  const organizerName = (event: EventItem) =>
    event.organizerId ? (organizations.data?.find((item) => item.id === event.organizerId)?.name ?? '') : "K'Plan"

  const onModerate = (event: EventItem, changes: { status?: 'published' | 'hidden'; featured?: boolean }) =>
    moderate.mutate(
      { id: event.id, changes },
      {
        onSuccess: () =>
          toast({
            title:
              changes.featured !== undefined
                ? changes.featured
                  ? 'Destacado en la app'
                  : 'Ya no está destacado'
                : changes.status === 'hidden'
                  ? 'Evento oculto'
                  : 'Evento publicado',
          }),
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    )

  const description = isAdmin
    ? "Todos los eventos de la app. Publica los especiales de K'Plan y destaca los que valen la pena."
    : role === 'alcaldia'
      ? 'Talleres, charlas y ferias de tu ciudad. Aparecen en la app y en tu agenda.'
      : 'Mini eventos en tu lugar: música, catas, noches especiales. Aparecen en la app junto a los de tu ciudad.'

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Eventos"
        description={description}
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setEditing('new')}>
            {isAdmin ? 'Evento especial' : 'Nuevo evento'}
          </Button>
        }
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <Tabs
          label="Eventos"
          value={section}
          onChange={setSection}
          items={[
            { value: 'proximos', label: 'Próximos', count: upcoming.length },
            { value: 'pasados', label: 'Pasados', count: past.length },
          ]}
          className="flex-1"
        />
        {isAdmin && (
          <Select aria-label="Organizador" value={organizer} onChange={(event) => setOrganizer(event.target.value)} className="w-60">
            <option value="">Todos los organizadores</option>
            <option value="kplan">K'Plan</option>
            {organizations.data?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        )}
      </div>

      {events.isPending ? (
        <SkeletonRows rows={4} />
      ) : events.isError ? (
        <ErrorState error={events.error} onRetry={() => void events.refetch()} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<CalendarHeart size={20} />}
          title={section === 'proximos' ? 'No tienes eventos próximos' : 'Todavía no hay eventos pasados'}
          action={
            section === 'proximos' && (
              <Button icon={<Plus size={16} />} onClick={() => setEditing('new')}>
                Publicar un evento
              </Button>
            )
          }
        >
          {section === 'proximos' && 'Un evento le da al turista una razón para agregarte a su día.'}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-divider rounded-kp border border-divider bg-surface">
          {shown.map((event) => (
            <li key={event.id} className={cn('flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap', event.status === 'hidden' && 'bg-canvas/60')}>
              <DateBlock date={event.date} past={event.date < today} />
              <img src={event.image} alt="" loading="lazy" className="hidden size-16 shrink-0 rounded-sm bg-placeholder object-cover md:block" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-body font-semibold text-ink">{event.title}</p>
                  <Tag tone="outline">{event.category}</Tag>
                  {event.featured && (
                    <Tag tone="ink" icon={<Star size={11} fill="currentColor" strokeWidth={0} aria-hidden="true" />}>
                      Destacado
                    </Tag>
                  )}
                  {event.status === 'hidden' && <Tag tone="neutral">Oculto</Tag>}
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-small text-muted">
                  {event.startTime && (
                    <span className="tabular-nums">
                      {event.startTime}
                      {event.endTime && ` – ${event.endTime}`}
                    </span>
                  )}
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MapPin size={13} aria-hidden="true" />
                    <span className="truncate">{event.address}</span>
                  </span>
                  <span>{event.price === 0 ? 'Entrada libre' : formatMoney(event.price)}</span>
                </p>
                {isAdmin && <p className="mt-0.5 text-caption text-hint">Organiza: {organizerName(event)}</p>}
              </div>
              <div className="flex shrink-0">
                {isAdmin && (
                  <>
                    <IconButton
                      label={event.featured ? 'Quitar de destacados' : 'Destacar en la app'}
                      icon={<Star size={16} fill={event.featured ? 'currentColor' : 'none'} />}
                      onClick={() => onModerate(event, { featured: !event.featured })}
                    />
                    <IconButton
                      label={event.status === 'hidden' ? 'Publicar' : 'Ocultar'}
                      icon={event.status === 'hidden' ? <Eye size={16} /> : <EyeOff size={16} />}
                      onClick={() => onModerate(event, { status: event.status === 'hidden' ? 'published' : 'hidden' })}
                    />
                  </>
                )}
                {(isAdmin || event.organizerId === organizationId) && (
                  <>
                    <IconButton label="Editar evento" icon={<Pencil size={16} />} onClick={() => setEditing(event)} />
                    <IconButton
                      label="Borrar evento"
                      icon={<Trash2 size={16} />}
                      onClick={() => setDeleting(event)}
                      className="text-danger hover:bg-danger/8"
                    />
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <EventDrawer
        open={editing !== null}
        event={editing === 'new' ? null : editing}
        places={places.data ?? []}
        city={organization?.city ?? 'Granada'}
        isAdmin={isAdmin}
        onClose={() => setEditing(null)}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="¿Borrar este evento?"
        confirmLabel="Borrar evento"
        loading={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              setDeleting(null)
              toast({ title: 'Evento borrado' })
            },
            onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
          })
        }
      >
        "{deleting?.title}" desaparece de la app. Si sólo quieres esconderlo un tiempo, apaga "Publicado".
      </ConfirmDialog>
    </div>
  )
}
