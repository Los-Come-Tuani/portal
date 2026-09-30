import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Check, ChevronDown, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { paths } from '@/app/router/paths'
import { Logo } from '@/components/brand/Logo'
import { Button, useToast } from '@/components/ui'
import { ApiError, errorMessage } from '@/data/api/errors'
import { useCreateAssisted } from '@/data/hooks/use-admissions'
import { useAvailablePlaces } from '@/data/hooks/use-places'
import { admissionsRepository } from '@/data/repositories/admissions.repository'
import { normalizeRuc } from '@/data/schemas/organization-application.schema'
import { useAuth } from '@/features/auth/use-auth'
import { cn } from '@/lib/cn'
import { clearDraft, loadDraft, saveDraft, STEPS, stepOfField, validateStep, type ApplicationDraft, type FieldErrors, type StepKey, type WizardMode } from '../lib/draft'
import { ApplyGuide } from './ApplyGuide'
import { StepDocuments, StepOrganization, StepPlace, StepRepresentative, StepReview } from './ApplySteps'

const STEP_LABELS: Record<WizardMode, Record<StepKey, string>> = {
  public: Object.fromEntries(STEPS.map((item) => [item.key, item.label])) as Record<StepKey, string>,
  assisted: {
    organization: 'La organización',
    place: 'Su lugar',
    representative: 'Quién la representa',
    documents: 'Documentos',
    review: 'Revisa y crea',
  },
}

const COPY: Record<WizardMode, Record<StepKey, { title: string; description: string }>> = {
  public: {
    organization: { title: 'Cuéntanos de tu organización', description: 'Así te va a encontrar el turista en la app.' },
    place: { title: '¿Cuál es tu lugar?', description: 'Cada lugar es una parada en la app: el turista la agenda en su itinerario y escanea su QR al llegar.' },
    representative: { title: '¿Quién la representa?', description: 'Con este correo y contraseña entras al portal mientras revisamos tu solicitud.' },
    documents: {
      title: 'Sube tus documentos',
      description: 'Con ellos comprobamos que tu organización es legítima. Fotos claras con las cuatro esquinas visibles, o PDF.',
    },
    review: { title: 'Revisa y envía', description: "El equipo de K'Plan revisa cada documento y te avisa por correo y aquí en el portal." },
  },
  assisted: {
    organization: { title: 'La organización', description: 'Con los datos que te dio el negocio o la alcaldía.' },
    place: { title: 'Su lugar', description: 'Uno que ya está en la app, o uno nuevo que queda como borrador hasta que se apruebe.' },
    representative: { title: 'Quién la representa', description: 'Le llega un correo para crear su contraseña y entrar al portal.' },
    documents: { title: 'Sus documentos', description: 'Sube los que te entregaron: se revisan igual que en cualquier otra solicitud.' },
    review: { title: 'Revisa y crea la solicitud', description: 'Queda en Solicitudes, en la etapa de documentos, para que alguien del equipo la revise.' },
  },
}

/**
 * La postulación en cinco pasos. `public`: la organización se postula sola y
 * queda con la sesión abierta. `assisted`: alguien del equipo la llena por ella.
 */
export function ApplicationWizard({ mode }: { mode: WizardMode }) {
  const { acceptSession } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const createAssisted = useCreateAssisted()
  const [draft, setDraft] = useState<ApplicationDraft>(() => loadDraft(mode))
  const [step, setStep] = useState(0)
  const [reached, setReached] = useState(0)
  const [errors, setErrors] = useState<FieldErrors>({})
  const headingRef = useRef<HTMLHeadingElement>(null)
  const places = useAvailablePlaces(draft.city)
  const key = STEPS[step].key
  const assisted = mode === 'assisted'

  useEffect(() => saveDraft(draft, mode), [draft, mode])

  const payload = () => ({
    ...draft,
    ruc: draft.type === 'negocio' ? normalizeRuc(draft.ruc) : '',
    legalName: draft.type === 'negocio' ? draft.legalName : '',
    kind: draft.type === 'negocio' ? draft.kind : 'Alcaldía municipal',
  })

  const onError = (error: Error) => {
    if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
      const fields = Object.keys(error.fieldErrors)
      setErrors(error.fieldErrors)
      goTo(STEPS.findIndex((item) => item.key === stepOfField(fields[0])))
    }
    toast({ title: errorMessage(error), tone: 'error' })
  }

  const apply = useMutation({
    mutationFn: () => admissionsRepository.apply(payload()),
    onSuccess: async (response) => {
      clearDraft(mode)
      toast({ title: 'Recibimos tu solicitud', description: 'Te avisamos cuando el equipo la revise. Mientras tanto, puedes completar la ficha de tu lugar.' })
      await acceptSession(response)
    },
    onError,
  })

  const submitting = apply.isPending || createAssisted.isPending

  const submit = () => {
    if (!assisted) {
      apply.mutate()
      return
    }
    const { password: _password, passwordConfirm: _confirm, ...input } = payload()
    createAssisted.mutate(input, {
      onSuccess: (application) => {
        clearDraft(mode)
        toast({ title: 'Solicitud creada', description: `A ${application.representative.email} le llegó una invitación para entrar al portal.` })
        navigate(paths.admission(application.id))
      },
      onError,
    })
  }

  const update = (patch: Partial<ApplicationDraft>) => {
    setDraft((current) => ({ ...current, ...patch }))
    if (Object.keys(errors).length > 0) setErrors({})
  }

  function goTo(index: number) {
    setStep(index)
    setErrors((current) => (index === step ? current : {}))
    window.scrollTo({ top: 0 })
    requestAnimationFrame(() => headingRef.current?.focus())
  }

  const next = () => {
    const found = validateStep(key, draft, mode)
    if (Object.keys(found).length > 0) {
      setErrors(found)
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    if (key === 'review') {
      submit()
      return
    }
    setReached((value) => Math.max(value, step + 1))
    goTo(step + 1)
  }

  const placeNames = (places.data ?? []).filter((stop) => draft.claimedStopIds.includes(stop.id)).map((stop) => stop.name)
  const stepProps = { draft, errors, update, mode }
  const Heading = assisted ? 'h2' : 'h1'

  const stepList = (
    <nav aria-label="Pasos de la solicitud">
      <ol className="flex flex-col gap-1">
        {STEPS.map((item, index) => {
          const done = index < reached
          const current = index === step
          const reachable = index <= reached && !submitting
          return (
            <li key={item.key}>
              <button
                type="button"
                disabled={!reachable || current}
                onClick={() => goTo(index)}
                aria-current={current ? 'step' : undefined}
                className={cn(
                  'flex min-h-12 w-full items-center gap-3 rounded-kp px-3 py-3 text-left text-body transition-colors duration-150',
                  reachable && !current && (assisted ? 'hover:bg-canvas' : 'hover:bg-paper-deep'),
                  current ? 'font-semibold text-ink' : reachable ? 'text-ink' : 'text-muted',
                )}
              >
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full text-small font-semibold tabular-nums',
                    current ? 'bg-ink text-canvas' : done ? 'bg-confirmed text-white' : 'border border-outline text-muted',
                  )}
                >
                  {done && !current ? <Check size={14} strokeWidth={2.5} aria-hidden="true" /> : index + 1}
                </span>
                {STEP_LABELS[mode][item.key]}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )

  const form = (
    <>
      <div className="mb-6 flex items-center gap-3 lg:hidden">
        <span className="flex flex-1 gap-1" aria-hidden="true">
          {STEPS.map((item, index) => (
            <span key={item.key} className={cn('h-1.5 flex-1 rounded-full', index <= step ? 'bg-ink' : 'bg-divider')} />
          ))}
        </span>
        <span className="text-caption text-muted tabular-nums">
          {step + 1} de {STEPS.length}
        </span>
      </div>

      <Heading
        ref={headingRef}
        tabIndex={-1}
        className={cn('font-bold tracking-tight text-ink focus-visible:outline-none', assisted ? 'text-heading' : 'text-headline')}
      >
        {COPY[mode][key].title}
      </Heading>
      <p className="mt-1.5 max-w-[60ch] text-body text-muted">{COPY[mode][key].description}</p>

      <details className="group mt-5 rounded-panel border border-divider bg-surface lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-small font-semibold text-ink">
          Qué documentos {assisted ? 'se necesitan' : 'vas a necesitar'}
          <ChevronDown size={16} className="text-muted transition-transform duration-200 ease-out-expo group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t border-divider px-4 py-4">
          <ApplyGuide type={draft.type} titled={false} assisted={assisted} />
        </div>
      </details>

      <form
        noValidate
        className="mt-8"
        onSubmit={(event) => {
          event.preventDefault()
          next()
        }}
      >
        {key === 'organization' && <StepOrganization {...stepProps} />}
        {key === 'place' && <StepPlace {...stepProps} />}
        {key === 'representative' && <StepRepresentative {...stepProps} />}
        {key === 'documents' && <StepDocuments {...stepProps} />}
        {key === 'review' && (
          <StepReview {...stepProps} placeNames={placeNames} goTo={(target) => goTo(STEPS.findIndex((item) => item.key === target))} />
        )}

        <div className="mt-10 flex items-center justify-between gap-3 border-t border-divider pt-6">
          {step > 0 ? (
            <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => goTo(step - 1)} disabled={submitting}>
              Atrás
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" size="lg" icon={key === 'review' ? <Send size={16} /> : <ArrowRight size={16} />} loading={submitting}>
            {key === 'review' ? (assisted ? 'Crear solicitud' : 'Enviar solicitud') : 'Continuar'}
          </Button>
        </div>
      </form>
    </>
  )

  if (assisted) {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 max-w-2xl">{form}</div>
        <aside className="hidden rounded-panel border border-divider bg-surface p-6 lg:sticky lg:top-24 lg:flex lg:flex-col lg:gap-8">
          {stepList}
          <ApplyGuide type={draft.type} assisted />
        </aside>
      </div>
    )
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="flex min-w-0 flex-col px-5 pt-6 pb-16 sm:px-10 lg:bg-surface">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link to={paths.login} aria-label="K'Plan, volver a la entrada">
            <Logo className="h-9 text-ink" />
          </Link>
          <p className="text-small text-muted">
            ¿Ya tienes cuenta?{' '}
            <Link to={paths.login} className="font-semibold text-ink underline decoration-outline underline-offset-4 hover:decoration-ink">
              Entra
            </Link>
          </p>
        </header>
        <main className="mx-auto w-full min-w-0 max-w-2xl pt-10">{form}</main>
      </div>
      <aside className="relative hidden border-l border-divider bg-canvas lg:block">
        <div className="sticky top-0 flex max-h-dvh flex-col gap-8 overflow-y-auto px-10 pt-24 pb-10">
          {stepList}
          <ApplyGuide type={draft.type} />
        </div>
      </aside>
    </div>
  )
}
