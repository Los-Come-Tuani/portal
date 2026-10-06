import { Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, Field, Input, useToast } from '@/components/ui'
import { env } from '@/config/env'
import { errorMessageWithWait } from '@/data/api/errors'
import { useRequestCode } from '@/data/hooks/use-applications'
import { validateEmail, type ApplicantDraft, type FieldErrors } from '@/data/schemas/application.schema'

/** Cuánto hay que esperar para pedir otro código: el API tampoco lo reenvía antes. */
const RESEND_SECONDS = 60

interface AccountFieldsProps {
  applicant: ApplicantDraft
  errors: FieldErrors
  update: (patch: Partial<ApplicantDraft>) => void
}

/** La cuenta de quien se postula: nombre, correo verificado con un código, y contraseña. */
export function AccountFields({ applicant, errors, update }: AccountFieldsProps) {
  const request = useRequestCode()
  const toast = useToast()
  const [sent, setSent] = useState(false)
  const [wait, setWait] = useState(0)
  const [emailProblem, setEmailProblem] = useState<string | null>(null)

  useEffect(() => {
    if (wait <= 0) return
    const timer = window.setTimeout(() => setWait((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [wait])

  const sendCode = () => {
    const problem = validateEmail(applicant.email)
    setEmailProblem(problem)
    if (problem) return
    request.mutate(applicant.email, {
      onSuccess: () => {
        setSent(true)
        setWait(RESEND_SECONDS)
        toast({ title: 'Te mandamos un código', description: `Revisa el correo ${applicant.email.trim()}: vence en 15 minutos.` })
      },
      onError: (error) => toast({ title: errorMessageWithWait(error), tone: 'error' }),
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Tu nombre" error={errors['applicant.firstName']}>
          {(control) => (
            <Input {...control} autoComplete="given-name" value={applicant.firstName} onChange={(event) => update({ firstName: event.target.value })} />
          )}
        </Field>
        <Field label="Tu apellido" optional error={errors['applicant.lastName']}>
          {(control) => (
            <Input {...control} autoComplete="family-name" value={applicant.lastName} onChange={(event) => update({ lastName: event.target.value })} />
          )}
        </Field>
      </div>

      <div className="flex flex-col gap-3 rounded-kp border border-divider bg-surface p-4">
        <Field
          label="Tu correo"
          hint="Te mandamos un código para comprobar que es tuyo. Con este correo entras al portal."
          error={errors['applicant.email'] ?? emailProblem ?? undefined}
        >
          {(control) => (
            <Input
              {...control}
              type="email"
              autoComplete="email"
              value={applicant.email}
              onChange={(event) => {
                setEmailProblem(null)
                // Otro correo necesita otro código.
                setSent(false)
                update({ email: event.target.value, code: '' })
              }}
            />
          )}
        </Field>
        <Button
          variant="secondary"
          size="sm"
          icon={<Mail size={14} />}
          className="self-start"
          loading={request.isPending}
          disabled={wait > 0}
          onClick={sendCode}
        >
          {wait > 0 ? `Reenviar en ${wait} s` : sent ? 'Reenviar el código' : 'Enviarme el código'}
        </Button>
        <Field label="Código del correo" error={errors['applicant.code']} hint={sent ? 'Son 6 dígitos.' : 'Pídelo con el botón de arriba.'}>
          {(control) => (
            <Input
              {...control}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              value={applicant.code}
              onChange={(event) => update({ code: event.target.value.replace(/\D/g, '') })}
            />
          )}
        </Field>
        {/* El demo no manda correos: este es el código que sirve. */}
        {env.useMocks && <p className="text-small text-muted">Modo demo: el código es 123456.</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Contraseña" hint="Al menos 8 caracteres, una mayúscula y un número." error={errors['applicant.password']}>
          {(control) => (
            <Input {...control} type="password" autoComplete="new-password" value={applicant.password} onChange={(event) => update({ password: event.target.value })} />
          )}
        </Field>
        <Field label="Repite la contraseña" error={errors['applicant.passwordConfirm']}>
          {(control) => (
            <Input
              {...control}
              type="password"
              autoComplete="new-password"
              value={applicant.passwordConfirm}
              onChange={(event) => update({ passwordConfirm: event.target.value })}
            />
          )}
        </Field>
      </div>
    </div>
  )
}
