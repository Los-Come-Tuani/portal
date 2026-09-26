import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Check, ChevronDown, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { paths } from '@/app/router/paths'
import { Logo } from '@/components/brand/Logo'
import { Button, useToast } from '@/components/ui'
import { ApiError, errorMessage } from '@/data/api/errors'
import { useAvailablePlaces } from '@/data/hooks/use-places'
import { admissionsRepository } from '@/data/repositories/admissions.repository'
import { normalizeRuc } from '@/data/schemas/organization-application.schema'
import { useAuth } from '@/features/auth/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { cn } from '@/lib/cn'
import { ApplyGuide } from './components/ApplyGuide'
import { StepDocuments, StepOrganization, StepPlace, StepRepresentative, StepReview } from './components/ApplySteps'
import { clearDraft, loadDraft, saveDraft, STEPS, stepOfField, validateStep, type ApplicationDraft, type FieldErrors, type StepKey } from './lib/draft'

const COPY: Record<StepKey, { title: string; description: string }> = {
  organization: { title: 'Cuéntanos de tu organización', description: 'Así te va a encontrar el turista en la app.' },
  place: { title: '¿Cuál es tu lugar?', description: 'Cada lugar es una parada en la app: el turista la agenda en su itinerario y escanea su QR al llegar.' },
  representative: { title: '¿Quién la representa?', description: 'Con este correo y contraseña entras al portal mientras revisamos tu solicitud.' },
  documents: {
    title: 'Sube tus documentos',
    description: 'Con ellos comprobamos que tu organización es legítima. Fotos claras con las cuatro esquinas visibles, o PDF.',
  },
  review: { title: 'Revisa y envía', description: "El equipo de K'Plan revisa cada documento y te avisa por correo y aquí en el portal." },
}

/** Postularse para entrar a K'Plan: negocios y alcaldías, sin cuenta todavía. */
export function ApplyPage() {
  useDocumentTitle('Postúlate')
  const { acceptSession } = useAuth()
  const toast = useToast()
  const [draft, setDraft] = useState<ApplicationDraft>(loadDraft)
  const [step, setStep] = useState(0)
  const [reached, setReached] = useState(0)
  const [errors, setErrors] = useState<FieldErrors>({})
  const headingRef = useRef<HTMLHeadingElement>(null)
  const places = useAvailablePlaces(draft.city)
  const key = STEPS[step].key

  useEffect(() => saveDraft(draft), [draft])

  const submit = useMutation({
    mutationFn: () =>
      admissionsRepository.apply({
        ...draft,
        ruc: draft.type === 'negocio' ? normalizeRuc(draft.ruc) : '',
        legalName: draft.type === 'negocio' ? draft.legalName : '',
        kind: draft.type === 'negocio' ? draft.kind : 'Alcaldía municipal',
      }),
    onSuccess: async (response) => {
      clearDraft()
      toast({ title: 'Recibimos tu solicitud', description: 'Te avisamos cuando el equipo la revise. Mientras tanto, puedes completar la ficha de tu lugar.' })
      await acceptSession(response)
    },
    onError: (error) => {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
        const fields = Object.keys(error.fieldErrors)
        setErrors(error.fieldErrors)
        goTo(STEPS.findIndex((item) => item.key === stepOfField(fields[0])))
      }
      toast({ title: errorMessage(error), tone: 'error' })
    },
  })

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
    const found = validateStep(key, draft)
    if (Object.keys(found).length > 0) {
      setErrors(found)
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"], [data-step-error]')?.focus())
      return
    }
    if (key === 'review') {
      submit.mutate()
      return
    }
    setReached((value) => Math.max(value, step + 1))
    goTo(step + 1)
  }

  const placeNames = (places.data ?? []).filter((stop) => draft.claimedStopIds.includes(stop.id)).map((stop) => stop.name)
  const stepProps = { draft, errors, update }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="flex flex-col px-5 pt-6 pb-16 sm:px-10">
        <header className="flex items-center justify-between gap-4">
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

        <main className="mx-auto w-full max-w-2xl pt-10">
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

          <h1 ref={headingRef} tabIndex={-1} className="text-headline font-bold tracking-tight text-ink focus-visible:outline-none">
            {COPY[key].title}
          </h1>
          <p className="mt-1.5 max-w-[60ch] text-body text-muted">{COPY[key].description}</p>

          <details className="group mt-5 rounded-kp border border-divider bg-paper lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-small font-semibold text-ink">
              Qué documentos vas a necesitar
              <ChevronDown size={16} className="text-muted transition-transform duration-200 ease-out-expo group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="border-t border-divider px-4 py-4">
              <ApplyGuide type={draft.type} titled={false} />
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
                <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => goTo(step - 1)} disabled={submit.isPending}>
                  Atrás
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" size="lg" icon={key === 'review' ? <Send size={16} /> : <ArrowRight size={16} />} loading={submit.isPending}>
                {key === 'review' ? 'Enviar solicitud' : 'Continuar'}
              </Button>
            </div>
          </form>
        </main>
      </div>

      <aside className="relative hidden bg-paper lg:block">
        <div className="sticky top-0 flex max-h-dvh flex-col gap-8 overflow-y-auto px-10 pt-24 pb-10">
          <nav aria-label="Pasos de la solicitud">
            <ol className="flex flex-col gap-1">
              {STEPS.map((item, index) => {
                const done = index < reached
                const current = index === step
                const reachable = index <= reached && !submit.isPending
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      disabled={!reachable || current}
                      onClick={() => goTo(index)}
                      aria-current={current ? 'step' : undefined}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-kp px-2 py-2 text-left text-body transition-colors duration-150',
                        reachable && !current && 'hover:bg-paper-deep',
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
                      {item.label}
                    </button>
                  </li>
                )
              })}
            </ol>
          </nav>

          <ApplyGuide type={draft.type} />
        </div>
      </aside>
    </div>
  )
}
