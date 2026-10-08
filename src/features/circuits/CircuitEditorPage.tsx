import { ArrowLeft, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router'
import { paths } from '@/app/router/paths'
import { ConfirmDialog, ErrorState, IconButton, Panel, SaveBar, Skeleton, Switch, Tag, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useCircuit, useDeleteCircuit, useGroupSessions, useSaveCircuit } from '@/data/hooks/use-circuits'
import { useOrganizations } from '@/data/hooks/use-organizations'
import { usePlaces } from '@/data/hooks/use-places'
import type { Circuit, CircuitInput, Stop } from '@/data/models'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useNow } from '@/hooks/use-now'
import { checkStartTimes } from '@/lib/circuits'
import { plural } from '@/lib/format'
import { CircuitForm } from './components/CircuitForm'
import { CircuitKindTag } from './components/CircuitKindTag'
import { GroupSessionsPanel } from './components/GroupSessionsPanel'
import { ItineraryPreview } from './components/ItineraryPreview'
import { emptyCircuit, serverErrors, toCircuitInput, validateCircuit, type CircuitErrors } from './lib/form'
import { circuitStatus } from './lib/labels'

/** Después de pintar los errores, lleva al primero que se ve en la página. */
function scrollToFirstError() {
  requestAnimationFrame(() =>
    document.querySelector('main [aria-invalid="true"], main p.text-danger')?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
  )
}

export function CircuitEditorPage() {
  const { circuitId = '' } = useParams()
  const isNew = circuitId === 'nuevo'
  const circuit = useCircuit(isNew ? undefined : circuitId)

  if (!isNew && circuit.isError) return <ErrorState error={circuit.error} onRetry={() => void circuit.refetch()} />
  if (!isNew && !circuit.data) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-[40rem]" />
      </div>
    )
  }
  return <CircuitEditor key={circuit.data?.id ?? 'nuevo'} circuit={isNew ? null : (circuit.data ?? null)} />
}

function CircuitEditor({ circuit }: { circuit: Circuit | null }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { today } = useNow()
  const places = usePlaces({})
  const alcaldias = useOrganizations({ type: 'alcaldia' })
  const save = useSaveCircuit()
  const remove = useDeleteCircuit()
  const wasGroup = !!circuit && (circuit.isCreativeCircuit || (circuit.isKplanCircuit && circuit.bookingMode === 'group'))
  const sessions = useGroupSessions(circuit?.id, wasGroup)
  const enrolled = (sessions.data ?? []).reduce((sum, session) => sum + session.joinedCount, 0)
  const initial = useMemo(() => (circuit ? toCircuitInput(circuit) : emptyCircuit()), [circuit])
  const [draft, setDraft] = useState<CircuitInput>(initial)
  const [errors, setErrors] = useState<CircuitErrors>({})
  const [deleting, setDeleting] = useState(false)
  useDocumentTitle(circuit?.shortTitle ?? 'Nuevo circuito')

  const stops = useMemo(() => (places.data ?? []).filter((stop) => stop.active), [places.data])
  const ordered = draft.stopIds.map((id) => stops.find((stop) => stop.id === id)).filter((stop): stop is Stop => !!stop && stop.city === draft.city)
  const flaggedTimes = checkStartTimes({ stops: ordered, travelMode: draft.travelMode, legMinutes: draft.legMinutes }, draft.startTimes)
    .filter((check) => check.blocking.length > 0)
    .map((check) => check.startTime)
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  const leaving = useRef(false)
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !leaving.current && currentLocation.pathname !== nextLocation.pathname)

  const leave = (to: string) => {
    leaving.current = true
    navigate(to, { replace: true })
  }

  const discard = () => {
    if (!circuit) {
      leave(paths.circuits)
      return
    }
    setDraft(initial)
    setErrors({})
  }

  const update = (patch: Partial<CircuitInput>) => {
    setDraft((current) => ({ ...current, ...patch }))
    setErrors((current) => {
      const next = { ...current }
      for (const key of Object.keys(patch)) delete next[key]
      return next
    })
  }

  const submit = () => {
    const { data, errors: found } = validateCircuit(draft)
    if (!data) {
      setErrors(found)
      toast({ title: 'Revisa los campos marcados', tone: 'error' })
      scrollToFirstError()
      return
    }
    save.mutate(
      { id: circuit?.id, input: data },
      {
        onSuccess: (saved) => {
          toast({
            title: circuit ? 'Cambios guardados' : `Creaste ${saved.shortTitle}`,
            description: saved.draft ? 'Es un borrador: no está en la app hasta que lo publiques.' : 'Así lo ve el turista en la app.',
          })
          if (circuit) setDraft(toCircuitInput(saved))
          else leave(paths.circuit(saved.id))
        },
        onError: (error) => {
          const fromServer = serverErrors(error)
          toast({ title: fromServer ? (Object.values(fromServer)[0] ?? errorMessage(error)) : errorMessage(error), tone: 'error' })
          if (fromServer) {
            setErrors(fromServer)
            scrollToFirstError()
          }
        },
      },
    )
  }

  const status = circuit ? circuitStatus(circuit, today) : null
  const group = draft.kind === 'creative' || (draft.kind === 'kplan' && draft.bookingMode === 'group')
  const title = draft.shortTitle.trim() || (circuit ? circuit.shortTitle : 'Nuevo circuito')

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link to={paths.circuits} className="inline-flex items-center gap-1.5 self-start text-small font-semibold text-muted hover:text-ink">
          <ArrowLeft size={15} aria-hidden="true" />
          Circuitos
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-headline font-bold tracking-tight text-ink">{title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-small text-muted">
              <CircuitKindTag kind={draft.kind} />
              {status && <Tag tone={status.tone}>{status.label}</Tag>}
              {status?.detail && <span>{status.detail}</span>}
              {circuit && circuit.reviewsCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    {circuit.rating.toFixed(1)} ({circuit.reviewsCount} reseñas de turistas)
                  </span>
                </>
              )}
            </div>
          </div>
          {circuit && (
            <IconButton
              label={enrolled > 0 ? `No se puede borrar: tiene ${plural(enrolled, 'persona inscrita', 'personas inscritas')}` : 'Borrar circuito'}
              icon={<Trash2 size={17} />}
              tone="danger"
              disabled={enrolled > 0}
              onClick={() => setDeleting(true)}
            />
          )}
        </div>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel>
            {places.isPending ? (
              <Skeleton className="h-[36rem]" />
            ) : (
              <CircuitForm draft={draft} errors={errors} update={update} stops={stops} alcaldias={alcaldias.data ?? []} flaggedTimes={flaggedTimes} />
            )}
          </Panel>
          {circuit && group && <GroupSessionsPanel circuitId={circuit.id} />}
        </div>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-24">
          <Panel bodyClassName="flex flex-col gap-2 p-5">
            <Switch
              checked={!draft.draft}
              onChange={(published) => update({ draft: !published })}
              disabled={!draft.draft && !circuit?.draft && enrolled > 0}
              label="Publicado en la app"
              description={
                !draft.draft && !circuit?.draft && enrolled > 0
                  ? `Tiene ${plural(enrolled, 'persona inscrita', 'personas inscritas')} en horarios de grupo: no se puede sacar de la app mientras los tenga.`
                  : draft.draft
                    ? 'Es un borrador: el equipo lo ve aquí, el turista no.'
                    : flaggedTimes.length > 0
                      ? 'Primero corrige las horas de salida marcadas en rojo.'
                      : 'El turista lo ve en la app al guardar.'
              }
            />
            {errors.draft && <p className="text-caption font-medium text-danger">{errors.draft}</p>}
          </Panel>
          <ItineraryPreview
            stops={ordered}
            travelMode={draft.travelMode}
            legMinutes={draft.legMinutes}
            startTimes={draft.startTimes}
            kind={draft.kind}
            bonusBadges={draft.bonusBadges}
            city={draft.city}
          />
        </aside>
      </div>

      <SaveBar
        visible={dirty || !circuit}
        saving={save.isPending}
        onSave={submit}
        onDiscard={discard}
        message={circuit ? 'Tienes cambios sin guardar' : draft.draft ? 'Se crea como borrador' : 'Se publica en la app al crearlo'}
        saveLabel={circuit ? 'Guardar cambios' : 'Crear circuito'}
        discardLabel={circuit ? 'Descartar' : 'Cancelar'}
      />

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Tienes cambios sin guardar"
        confirmLabel="Salir sin guardar"
        onClose={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
      >
        Si sales ahora, se pierden los cambios del circuito.
      </ConfirmDialog>
      <ConfirmDialog
        open={deleting}
        title={`¿Borrar ${circuit?.shortTitle ?? 'este circuito'}?`}
        confirmLabel="Borrar circuito"
        loading={remove.isPending}
        onClose={() => setDeleting(false)}
        onConfirm={() =>
          circuit &&
          remove.mutate(circuit.id, {
            onSuccess: () => {
              toast({ title: `Borraste ${circuit.shortTitle}` })
              leave(paths.circuits)
            },
            onError: (error) => {
              setDeleting(false)
              toast({ title: errorMessage(error), tone: 'error' })
            },
          })
        }
      >
        Desaparece de la app y de "Mis circuitos" de quien lo tenía guardado. Si sólo quieres esconderlo un tiempo, apaga "Publicado en la app".
      </ConfirmDialog>
    </div>
  )
}
