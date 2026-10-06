import { ArrowLeft, ArrowRight, Check, ChevronDown, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { paths } from '@/app/router/paths'
import { Button, Checkbox, useToast } from '@/components/ui'
import { ApiError, errorMessage } from '@/data/api/errors'
import { useApply, useResubmitApplication, useVerifyCode } from '@/data/hooks/use-applications'
import type { OrganizationData } from '@/data/models'
import type { ApplicantDraft, FieldErrors } from '@/data/schemas/application.schema'
import { useAuth } from '@/features/auth/use-auth'
import { cn } from '@/lib/cn'
import {
  clearDraft,
  EMPTY_DRAFT,
  formErrorsFromApi,
  loadDraft,
  saveDraft,
  stepCopy,
  stepLabel,
  stepOfField,
  STEPS,
  toApplicantInput,
  validateStep,
  withKind,
  type FlowDraft,
  type FlowMode,
  type StepKey,
} from '../lib/flow'
import { AccountFields } from './AccountFields'
import { ApplicationSummary } from './ApplicationSummary'
import { DetailsFields } from './DetailsFields'
import { FlowGuide } from './FlowGuide'
import { KindFields } from './KindFields'
import { ProfileFields } from './ProfileFields'

interface ApplicationFlowProps {
  mode: FlowMode
  /** Al corregir: lo que ya mandó, para no volver a escribirlo. */
  initial?: OrganizationData
}

/**
 * El formulario de la solicitud, paso a paso. `apply`: la organización se postula sola, crea su
 * cuenta y queda con la sesión abierta. `correct`: quien ya se postuló corrige lo que el equipo
 * rechazó y lo manda de nuevo, con lo anterior ya llenado.
 */
export function ApplicationFlow({ mode, initial }: ApplicationFlowProps) {
  const { acceptSession } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const apply = useApply()
  const resubmit = useResubmitApplication()
  const verifyCode = useVerifyCode()
  const steps = STEPS[mode]
  const [draft, setDraft] = useState<FlowDraft>(() => (mode === 'apply' ? loadDraft() : { ...EMPTY_DRAFT, data: initial ?? null }))
  const [step, setStep] = useState(0)
  const [reached, setReached] = useState(mode === 'correct' ? steps.length - 1 : 0)
  const [errors, setErrors] = useState<FieldErrors>({})
  const headingRef = useRef<HTMLHeadingElement>(null)
  const key = steps[step]
  const kind = draft.data?.kind ?? null
  const Heading = mode === 'apply' ? 'h1' : 'h2'
  const copy = stepCopy(key, kind, mode)

  useEffect(() => {
    if (mode === 'apply') saveDraft(draft)
  }, [draft, mode])

  const submitting = apply.isPending || resubmit.isPending || verifyCode.isPending

  const clearErrors = () => {
    if (Object.keys(errors).length > 0) setErrors({})
  }
  const updateData = (patch: Partial<OrganizationData>) => {
    setDraft((current) => (current.data ? { ...current, data: { ...current.data, ...patch } as OrganizationData } : current))
    clearErrors()
  }
  const updateApplicant = (patch: Partial<ApplicantDraft>) => {
    setDraft((current) => ({ ...current, applicant: { ...current.applicant, ...patch } }))
    clearErrors()
  }

  function goTo(index: number) {
    if (index < 0 || index >= steps.length) return
    setStep(index)
    setErrors({})
    window.scrollTo({ top: 0 })
    requestAnimationFrame(() => headingRef.current?.focus())
  }

  const focusFirstInvalid = () =>
    requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())

  /** El API rechazó algo: se marca el campo y se vuelve al paso donde está. */
  const onSubmitError = (error: Error) => {
    if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
      const mapped = formErrorsFromApi(error.fieldErrors)
      const target = steps.indexOf(stepOfField(Object.keys(mapped)[0]))
      if (target >= 0) {
        goTo(target)
        setErrors(mapped)
        focusFirstInvalid()
      }
    }
    toast({ title: errorMessage(error), tone: 'error' })
  }

  const submit = () => {
    if (!draft.data) return
    if (mode === 'apply') {
      apply.mutate(
        { applicant: toApplicantInput(draft.applicant), data: draft.data },
        {
          onSuccess: async ({ user }) => {
            clearDraft()
            toast({ title: 'Recibimos tu solicitud', description: 'Te avisamos por correo cuando el equipo la revise.' })
            // Abre la sesión: esta ruta es solo para quien no ha entrado, así que el portal lo lleva a su solicitud.
            await acceptSession({ user }).catch((error: unknown) => toast({ title: errorMessage(error), tone: 'error' }))
          },
          onError: onSubmitError,
        },
      )
      return
    }
    resubmit.mutate(draft.data, {
      onSuccess: () => {
        toast({ title: 'Mandaste tu solicitud de nuevo', description: 'El equipo la vuelve a revisar y te avisa por correo.' })
        navigate(paths.application)
      },
      onError: onSubmitError,
    })
  }

  const next = async () => {
    const found = validateStep(key, draft)
    if (Object.keys(found).length > 0) {
      setErrors(found)
      focusFirstInvalid()
      return
    }
    if (key === 'account') {
      // El código se comprueba antes de seguir, sin gastarlo: así un código malo no se descubre hasta el final.
      try {
        await verifyCode.mutateAsync({ email: draft.applicant.email, code: draft.applicant.code })
      } catch (error) {
        setErrors({ 'applicant.code': error instanceof ApiError && error.status === 400 ? (error.fieldErrors.code ?? error.message) : errorMessage(error) })
        focusFirstInvalid()
        return
      }
    }
    if (key === 'review') {
      submit()
      return
    }
    setReached((value) => Math.max(value, step + 1))
    goTo(step + 1)
  }

  const stepList = (
    <nav aria-label="Pasos de la solicitud">
      <ol className="flex flex-col gap-1">
        {steps.map((item, index) => {
          const done = index < reached
          const current = index === step
          const reachable = index <= reached && !submitting
          return (
            <li key={item}>
              <button
                type="button"
                disabled={!reachable || current}
                onClick={() => goTo(index)}
                aria-current={current ? 'step' : undefined}
                className={cn(
                  'flex min-h-12 w-full items-center gap-3 rounded-kp px-3 py-3 text-left text-body transition-colors duration-150',
                  reachable && !current && 'hover:bg-canvas',
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
                {stepLabel(item, kind)}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )

  const goToStep = (target: StepKey) => goTo(steps.indexOf(target))

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 max-w-2xl">
        <div className="mb-6 flex items-center gap-3 lg:hidden">
          <span className="flex flex-1 gap-1" aria-hidden="true">
            {steps.map((item, index) => (
              <span key={item} className={cn('h-1.5 flex-1 rounded-full', index <= step ? 'bg-ink' : 'bg-divider')} />
            ))}
          </span>
          <span className="text-caption text-muted tabular-nums">
            {step + 1} de {steps.length}
          </span>
        </div>

        <Heading ref={headingRef} tabIndex={-1} className={cn('font-bold tracking-tight text-ink focus-visible:outline-none', mode === 'apply' ? 'text-headline' : 'text-heading')}>
          {copy.title}
        </Heading>
        <p className="mt-1.5 max-w-[60ch] text-body text-muted">{copy.description}</p>

        <details className="group mt-5 rounded-panel border border-divider bg-surface lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-small font-semibold text-ink">
            Qué vas a necesitar
            <ChevronDown size={16} className="text-muted transition-transform duration-200 ease-out-expo group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="border-t border-divider px-4 py-4">
            <FlowGuide kind={kind} titled={false} />
          </div>
        </details>

        <form
          noValidate
          className="mt-8"
          onSubmit={(event) => {
            event.preventDefault()
            void next()
          }}
        >
          {key === 'kind' && <KindFields value={kind} error={errors.kind} onChange={(chosen) => { setDraft((current) => withKind(current, chosen)); clearErrors() }} />}
          {key === 'profile' && draft.data && <ProfileFields data={draft.data} errors={errors} update={updateData} />}
          {key === 'details' && draft.data && <DetailsFields data={draft.data} errors={errors} update={updateData} />}
          {key === 'account' && <AccountFields applicant={draft.applicant} errors={errors} update={updateApplicant} />}
          {key === 'review' && draft.data && (
            <div className="flex flex-col gap-4">
              <ApplicationSummary data={draft.data} onEdit={goToStep} />
              {mode === 'apply' && (
                <section className="rounded-kp border border-divider bg-surface">
                  <header className="flex items-center justify-between gap-3 border-b border-divider px-4 py-2.5">
                    <h2 className="text-body font-semibold text-ink">Tu cuenta</h2>
                    <Button size="sm" variant="ghost" onClick={() => goToStep('account')}>
                      Editar
                    </Button>
                  </header>
                  <dl className="grid gap-x-6 gap-y-3 px-4 py-3 text-body sm:grid-cols-2">
                    <div>
                      <dt className="text-small text-muted">Nombre</dt>
                      <dd className="text-ink">{`${draft.applicant.firstName} ${draft.applicant.lastName}`.trim()}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-small text-muted">Correo</dt>
                      <dd className="break-words text-ink">{draft.applicant.email}</dd>
                    </div>
                  </dl>
                </section>
              )}
              <div className="mt-2 flex flex-col gap-1.5">
                <Checkbox
                  checked={draft.accepted}
                  onChange={(event) => {
                    setDraft((current) => ({ ...current, accepted: event.target.checked }))
                    clearErrors()
                  }}
                  label="Declaro que la información y los documentos son verdaderos"
                  description="Si algo no coincide, el equipo de K'Plan puede rechazar la solicitud."
                  aria-invalid={errors.accepted ? true : undefined}
                />
                {errors.accepted && <p className="text-caption font-medium text-danger">{errors.accepted}</p>}
              </div>
            </div>
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
              {key === 'review' ? (mode === 'apply' ? 'Enviar solicitud' : 'Mandar de nuevo') : 'Continuar'}
            </Button>
          </div>
        </form>
      </div>

      <aside className="hidden rounded-panel border border-divider bg-surface p-6 lg:sticky lg:top-24 lg:flex lg:flex-col lg:gap-8">
        {stepList}
        <FlowGuide kind={kind} />
      </aside>
    </div>
  )
}
