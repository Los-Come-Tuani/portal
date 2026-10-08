import { ArrowLeft, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router'
import { paths } from '@/app/router/paths'
import { ConfirmDialog, ErrorState, Field, IconButton, Input, Panel, SaveBar, Skeleton, Switch, Tag, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useCities } from '@/data/hooks/use-applications'
import { useCircuit, useCircuitList, useDepartures, useRetireCircuit, useSaveCircuit } from '@/data/hooks/use-circuits'
import { useOwnCity } from '@/data/hooks/use-own-city'
import { useCityStops } from '@/data/hooks/use-places'
import type { Circuit, CircuitInput, Stop } from '@/data/models'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useNow } from '@/hooks/use-now'
import { checkStartTimes } from '@/lib/circuits'
import { plural } from '@/lib/format'
import { CircuitForm } from './components/CircuitForm'
import { CircuitKindTag } from './components/CircuitKindTag'
import { DeparturesPanel } from './components/DeparturesPanel'
import { ItineraryPreview } from './components/ItineraryPreview'
import { useCircuitAccess } from './lib/access'
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
  const access = useCircuitAccess()
  const { manages, municipality } = access
  const municipalityMode = !manages && !!municipality
  const editable = circuit ? access.canEdit(circuit) : access.canCreate
  const readOnly = !editable

  // La alcaldía crea en su ciudad: la sesión no la trae, sale de sus lugares o de sus circuitos.
  const ownCity = useOwnCity(municipalityMode && !circuit ? municipality : null)
  const known = useCircuitList({}, municipalityMode && !circuit && !ownCity.city && !ownCity.isPending)
  const cities = useCities()
  const save = useSaveCircuit()
  const retire = useRetireCircuit()
  const departures = useDepartures(circuit?.id, circuit?.status === 'published')
  const booked = (departures.data ?? []).reduce((sum, departure) => sum + departure.booked, 0)

  const initial = useMemo(() => (circuit ? toCircuitInput(circuit) : emptyCircuit({ kind: municipalityMode ? 'creative' : 'kplan', cityId: '' })), [circuit, municipalityMode])
  const [draft, setDraft] = useState<CircuitInput>(initial)
  const [errors, setErrors] = useState<CircuitErrors>({})
  const [retiring, setRetiring] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  useDocumentTitle(circuit?.shortTitle ?? 'Nuevo circuito')

  const cityId = draft.cityId || (municipalityMode ? (ownCity.city?.id ?? known.data?.[0]?.cityId ?? '') : '')
  const view = cityId === draft.cityId ? draft : { ...draft, cityId }
  const cityOptions = useMemo(() => {
    const options = (cities.data ?? []).filter((item) => item.active).map((item) => ({ id: item.id, name: item.name, code: item.code }))
    if (circuit && !options.some((item) => item.id === circuit.cityId)) options.push({ id: circuit.cityId, name: circuit.city, code: circuit.cityCode })
    const sample = known.data?.[0]
    if (sample && !options.some((item) => item.id === sample.cityId)) options.push({ id: sample.cityId, name: sample.city, code: sample.cityCode })
    return options.sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [cities.data, circuit, known.data])
  const city = (cities.data ?? []).find((item) => item.id === cityId) ?? cityOptions.find((item) => item.id === cityId)
  const cityStops = useCityStops(city?.code)
  const stops = useMemo(() => cityStops.data ?? [], [cityStops.data])
  const stopNames = useMemo(() => Object.fromEntries((circuit?.stops ?? []).map((stop) => [stop.id, stop.name])), [circuit])

  const ordered = view.stopIds.map((id) => stops.find((stop) => stop.id === id)).filter((stop): stop is Stop => !!stop && stop.cityId === cityId)
  const flaggedTimes = checkStartTimes({ stops: ordered, travelMode: view.travelMode, legMinutes: view.legMinutes }, view.startTimes)
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
    if (readOnly) return
    setDraft((current) => ({ ...current, ...patch }))
    setErrors((current) => {
      const next = { ...current }
      for (const key of Object.keys(patch)) delete next[key]
      return next
    })
  }

  const submit = () => {
    const { data, errors: found } = validateCircuit(view, { cityRequired: manages })
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
            description: saved.status === 'published' ? 'Así lo ve el turista en la app.' : 'No está en la app hasta que lo publiques.',
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

  const closeRetire = () => {
    setRetiring(false)
    setConfirmName('')
  }

  const status = circuit ? circuitStatus(circuit, today) : null
  const title = draft.shortTitle.trim() || (circuit ? circuit.shortTitle : 'Nuevo circuito')
  const organizerName = municipalityMode ? (municipality?.name ?? null) : (circuit?.organizer?.name ?? null)
  const readOnlyNotice = !circuit
    ? null
    : circuit.status === 'retired'
      ? 'Se retiró: ya no está en la app ni se edita. Los itinerarios que lo seguían lo conservan.'
      : readOnly && municipality
        ? "Este circuito lo publica el equipo de K'Plan en tu ciudad: lo ves, pero no lo editas."
        : readOnly
          ? 'Tu rol puede ver los circuitos, pero no cambiarlos.'
          : null

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
              <CircuitKindTag kind={view.kind} />
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
          {circuit && editable && <IconButton label="Retirar circuito" icon={<Trash2 size={17} />} tone="danger" onClick={() => setRetiring(true)} />}
        </div>
        {readOnlyNotice && <p className="rounded-kp bg-paper px-4 py-3 text-small text-ink">{readOnlyNotice}</p>}
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel>
            {cities.isPending || (!!city && cityStops.isPending) ? (
              <Skeleton className="h-[36rem]" />
            ) : (
              <fieldset disabled={readOnly} className="min-w-0">
                <CircuitForm
                  draft={view}
                  errors={errors}
                  update={update}
                  stops={stops}
                  stopNames={stopNames}
                  cities={cityOptions}
                  cityName={city?.name ?? ''}
                  organizerName={organizerName}
                  municipalityMode={municipalityMode || (!manages && !!circuit)}
                  flaggedTimes={flaggedTimes}
                />
              </fieldset>
            )}
          </Panel>
          {circuit && circuit.status !== 'retired' && <DeparturesPanel departures={departures} published={circuit.status === 'published'} />}
        </div>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-24">
          <Panel bodyClassName="flex flex-col gap-2 p-5">
            <Switch
              checked={!view.draft}
              onChange={(published) => update({ draft: !published })}
              disabled={readOnly}
              label="Publicado en la app"
              description={
                view.draft
                  ? circuit?.status === 'published'
                    ? 'Al guardar sale de la app hasta que lo vuelvas a publicar.'
                    : 'Es un borrador: lo ves aquí, el turista no.'
                  : flaggedTimes.length > 0
                    ? 'Primero corrige las horas de salida marcadas en rojo.'
                    : 'El turista lo ve en la app al guardar. Publicarlo pide al menos una foto y una hora de salida.'
              }
            />
            {errors.draft && <p className="text-caption font-medium text-danger">{errors.draft}</p>}
          </Panel>
          <ItineraryPreview
            stops={ordered}
            travelMode={view.travelMode}
            legMinutes={view.legMinutes}
            startTimes={view.startTimes}
            kind={view.kind}
            bonusBadges={view.bonusBadges}
            city={city?.name ?? ''}
          />
        </aside>
      </div>

      {editable && (
        <SaveBar
          visible={dirty || !circuit}
          saving={save.isPending}
          onSave={submit}
          onDiscard={discard}
          message={circuit ? 'Tienes cambios sin guardar' : view.draft ? 'Se crea como borrador' : 'Se publica en la app al crearlo'}
          saveLabel={circuit ? 'Guardar cambios' : 'Crear circuito'}
          discardLabel={circuit ? 'Descartar' : 'Cancelar'}
        />
      )}

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Tienes cambios sin guardar"
        confirmLabel="Salir sin guardar"
        onClose={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
      >
        Si sales ahora, se pierden los cambios del circuito.
      </ConfirmDialog>
      {circuit && (
        <ConfirmDialog
          open={retiring}
          title={`¿Retirar ${circuit.shortTitle} para siempre?`}
          confirmLabel="Retirar circuito"
          loading={retire.isPending}
          confirmDisabled={confirmName.trim() !== circuit.shortTitle.trim()}
          onClose={closeRetire}
          onConfirm={() =>
            retire.mutate(circuit.id, {
              onSuccess: () => {
                toast({ title: `Retiraste ${circuit.shortTitle}` })
                leave(paths.circuits)
              },
              onError: (error) => {
                closeRetire()
                toast({ title: errorMessage(error), tone: 'error' })
              },
            })
          }
        >
          <div className="flex flex-col gap-4">
            <p>
              Sale de la app y ya no se puede editar ni volver a publicar. Los itinerarios que lo seguían lo conservan. Si sólo quieres esconderlo un tiempo,
              apaga "Publicado en la app".
            </p>
            {booked > 0 && (
              <p className="font-medium text-danger">
                Tiene {plural(booked, 'persona con reserva', 'personas con reserva')} en las próximas salidas de guía.
              </p>
            )}
            <Field label={`Para confirmar, escribe ${circuit.shortTitle}`}>
              {(control) => <Input {...control} value={confirmName} autoComplete="off" onChange={(event) => setConfirmName(event.target.value)} />}
            </Field>
          </div>
        </ConfirmDialog>
      )}
    </div>
  )
}
