import { ArrowRight, Gavel, KeyRound, Mail, Pencil } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { paths } from '@/app/router/paths'
import { Avatar, Button, ConfirmDialog, Dialog, Field, Input, Tag, useToast } from '@/components/ui'
import { ApiError, errorMessage } from '@/data/api/errors'
import { useSanctions } from '@/data/hooks/use-moderation'
import { useRenameAccount, useSendPasswordReset, useSetAccountStatus, useStaffRoles } from '@/data/hooks/use-users'
import {
  ORGANIZATION_KIND_LABELS,
  PROVIDER_STAGE_LABELS,
  PROVIDER_STATUS_LABELS,
  REQUEST_STATUS_LABELS,
  servicesLabel,
  type Account,
  type ProviderRequestSummary,
  type RequestStatus,
} from '@/data/models'
import { SanctionDialog } from '@/features/admin/moderation/SanctionDialog'
import { SanctionList } from '@/features/admin/moderation/SanctionList'
import { ChangeRoleDialog } from '@/features/admin/staff/components/ChangeRoleDialog'
import { whyNotTeam } from '@/features/admin/staff/team'
import { useSession } from '@/features/auth/use-auth'
import { cn } from '@/lib/cn'
import { nowLocalDateTime } from '@/lib/dates'
import { formatDate } from '@/lib/format'
import { ACCOUNT_STATUS_TONES, accountKind, accountStatusLabel, suspendEffect, usesApp } from './status'

const APPLICATION_DOT: Record<RequestStatus, string> = {
  submitted: 'border border-ink/40',
  in_review: 'bg-planned',
  approved: 'bg-confirmed',
  rejected: 'bg-danger',
}

interface UserSheetProps {
  account: Account | null
  /** Su solicitud de guía o traductor más reciente. */
  application: ProviderRequestSummary | undefined
  onClose: () => void
  /** La cuenta como quedó después de corregirle el nombre. */
  onChange: (account: Account) => void
}

export function UserSheet({ account, application, onClose, onChange }: UserSheetProps) {
  const session = useSession()
  const setStatus = useSetAccountStatus()
  const reset = useSendPasswordReset()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const [renaming, setRenaming] = useState(false)

  const isSelf = account?.id === session.user.id
  // Suspender, reactivar y mandar el código piden `users.manage`, también para el equipo.
  const canManage = !!account && !isSelf && session.can('users.manage')
  const canRename = !!account && !isSelf && (account.role === 'admin' ? session.can('staff.manage') : session.can('users.manage'))
  const suspended = account?.status === 'suspended'
  // Una invitación sin aceptar, una cuenta sin activar o que se está cerrando no tienen acceso que cambiar.
  const canToggle = canManage && (account?.status === 'active' || suspended)
  // Una cuenta de superusuario sólo la sanciona otro superusuario: el API responde 403 y lo dice.
  const canSanction = canManage && account?.status !== 'pending' && account?.status !== 'closing'
  const [sanctioning, setSanctioning] = useState(false)
  const sanctions = useSanctions({ userId: account?.id, pageSize: 10 }, !!account && session.can('users.view'))
  // Dar, cambiar o quitar el rol del equipo es de quien administra el equipo; a uno mismo, no.
  const canAssignRole = !!account && !isSelf && session.can('staff.manage')
  const staffRoles = useStaffRoles(canAssignRole)
  const [assigning, setAssigning] = useState(false)
  const teamProblem = account ? whyNotTeam(account) : null

  const close = () => {
    setRenaming(false)
    setAssigning(false)
    onClose()
  }

  const changeStatus = () => {
    if (!account) return
    const status = suspended ? 'active' : 'suspended'
    setStatus.mutate(
      { id: account.id, status },
      {
        onSuccess: () => {
          setConfirming(false)
          toast({ title: status === 'suspended' ? `Suspendiste la cuenta de ${account.name}` : `Reactivaste la cuenta de ${account.name}` })
          close()
        },
        onError: (error) => {
          setConfirming(false)
          toast({ title: errorMessage(error), tone: 'error' })
        },
      },
    )
  }

  const sendReset = () => {
    if (!account) return
    reset.mutate(account.id, {
      onSuccess: () => toast({ title: 'Código enviado', description: `Le llegó a ${account.email} para crear una contraseña nueva.` }),
      onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
    })
  }

  return (
    <Dialog
      open={account !== null}
      onClose={close}
      variant="sheet"
      title={account?.name ?? ''}
      description={account ? `${accountKind(account)}${account.role === null ? '' : ` · ${usesApp(account) ? 'usa la app' : 'entra al portal'}`}` : undefined}
      footer={
        account &&
        (canManage ? (
          <>
            <Button variant="ghost" icon={<KeyRound size={16} />} loading={reset.isPending} onClick={sendReset} className="mr-auto">
              Mandar código de contraseña
            </Button>
            {canSanction && (
              <Button variant="secondary" icon={<Gavel size={16} />} onClick={() => setSanctioning(true)}>
                Sancionar
              </Button>
            )}
            {canToggle &&
              (suspended ? (
                <Button onClick={() => setConfirming(true)}>Reactivar cuenta</Button>
              ) : (
                <Button variant="danger" onClick={() => setConfirming(true)}>
                  Suspender cuenta
                </Button>
              ))}
          </>
        ) : (
          <p className="mr-auto text-small text-muted">
            {isSelf ? 'Es tu cuenta: tus datos se cambian en Seguridad y tu perfil.' : 'Tu rol puede verla, pero no cambiarla.'}
          </p>
        ))
      }
    >
      {account && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Avatar name={account.name} size="lg" />
            <div className="flex flex-wrap items-center gap-2">
              <Tag tone={ACCOUNT_STATUS_TONES[account.status]}>{accountStatusLabel(account.status)}</Tag>
              {account.staffRole && <Tag tone="ink">{account.staffRole.name}</Tag>}
              {account.superuser && <Tag tone="ink">Superusuario</Tag>}
            </div>
            {canRename && !renaming && (
              <Button size="sm" variant="ghost" icon={<Pencil size={15} />} onClick={() => setRenaming(true)} className="ml-auto">
                Corregir nombre
              </Button>
            )}
          </div>

          {renaming && (
            <RenameForm
              key={account.id}
              account={account}
              onDone={(renamed) => {
                setRenaming(false)
                if (renamed) onChange(renamed)
              }}
            />
          )}

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-body">
            <div className="col-span-2">
              <dt className="text-small text-muted">Correo</dt>
              <dd className="flex items-center gap-2 text-ink">
                <Mail size={15} className="text-muted" aria-hidden="true" />
                <a href={`mailto:${account.email}`} className="truncate underline decoration-outline underline-offset-4 hover:decoration-ink">
                  {account.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-small text-muted">Ciudad</dt>
              <dd className="text-ink">{account.city ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-small text-muted">Cuenta creada</dt>
              <dd className="text-ink tabular-nums">{formatDate(account.createdAt)}</dd>
            </div>
          </dl>

          {account.organization && (
            <ContextLink
              label="Organización"
              title={account.organization.name}
              detail={`${ORGANIZATION_KIND_LABELS[account.organization.kind]} · ${account.organization.verified ? 'verificada' : 'en revisión'}`}
              to={session.can('organizations.review', 'organizations.manage') ? paths.organization(account.organization.id) : undefined}
            />
          )}
          {account.provider && !application && (
            <ContextLink
              label="Perfil de prestador"
              title={servicesLabel(account.provider.services)}
              detail={PROVIDER_STATUS_LABELS[account.provider.status]}
            />
          )}
          {application && (
            <ContextLink
              label="Verificación"
              title={
                application.stage
                  ? `${REQUEST_STATUS_LABELS[application.status]} · ${PROVIDER_STAGE_LABELS[application.stage]}`
                  : REQUEST_STATUS_LABELS[application.status]
              }
              tag={<span aria-hidden="true" className={cn('size-2.5 shrink-0 rounded-full', APPLICATION_DOT[application.status])} />}
              detail={`Envió su solicitud el ${formatDate(nowLocalDateTime(new Date(application.submittedAt)).slice(0, 10))}`}
              to={paths.guideApplication(application.id)}
            />
          )}
          {canAssignRole ? (
            <div className="flex items-center gap-3 rounded-kp border border-divider px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-small text-muted">Rol en el equipo</span>
                <span className="block text-body font-semibold text-ink">
                  {account.staffRole?.name ?? (account.superuser ? 'Superusuario, sin rol' : 'No es del equipo')}
                </span>
                <span className="block text-small text-muted">
                  {teamProblem ??
                    (account.staffRole
                      ? 'Lo que puede hacer en el portal.'
                      : account.superuser
                        ? 'Tiene todo el portal aunque no tenga rol.'
                        : 'Dale un rol para que entre al portal con esos permisos.')}
                </span>
              </span>
              {!teamProblem && (
                <Button size="sm" variant="secondary" disabled={!staffRoles.data} onClick={() => setAssigning(true)}>
                  {account.staffRole ? 'Cambiar' : 'Darle un rol'}
                </Button>
              )}
            </div>
          ) : (
            account.staffRole && <ContextLink label="Rol interno" title={account.staffRole.name} detail="Lo que puede hacer en el portal." />
          )}
          {sanctions.data && sanctions.data.results.length > 0 && (
            <section className="flex flex-col gap-2" aria-labelledby="sanciones-de-la-cuenta">
              <h3 id="sanciones-de-la-cuenta" className="text-small font-semibold text-muted">
                Sanciones
              </h3>
              <SanctionList sanctions={sanctions.data.results} />
            </section>
          )}
        </div>
      )}
      <SanctionDialog user={sanctioning && account ? { id: account.id, name: account.name } : null} onClose={() => setSanctioning(false)} />
      <ChangeRoleDialog
        person={assigning && account ? { id: account.id, name: account.name, role: account.staffRole } : null}
        roles={staffRoles.data ?? []}
        onClose={() => setAssigning(false)}
        onChanged={(member) => account && onChange({ ...account, role: 'admin', staffRole: member.role })}
        onRemoved={close}
      />

      <ConfirmDialog
        open={confirming}
        tone={suspended ? 'primary' : 'danger'}
        title={suspended ? `Reactivar a ${account?.name}` : `Suspender a ${account?.name}`}
        confirmLabel={suspended ? 'Reactivar' : 'Suspender'}
        loading={setStatus.isPending}
        onClose={() => setConfirming(false)}
        onConfirm={changeStatus}
      >
        {account && (suspended ? 'Vuelve a entrar con su correo y contraseña de siempre.' : suspendEffect(account))}
      </ConfirmDialog>
    </Dialog>
  )
}

function RenameForm({ account, onDone }: { account: Account; onDone: (renamed: Account | null) => void }) {
  const rename = useRenameAccount()
  const toast = useToast()
  const [firstName, setFirstName] = useState(account.firstName)
  const [lastName, setLastName] = useState(account.lastName)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = () => {
    if (!firstName.trim()) {
      setErrors({ firstName: 'Escribe su nombre' })
      return
    }
    rename.mutate(
      { id: account.id, input: { firstName, lastName } },
      {
        onSuccess: (renamed) => {
          toast({ title: 'Nombre corregido' })
          onDone(renamed)
        },
        onError: (error) => {
          if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) setErrors(error.fieldErrors)
          else toast({ title: errorMessage(error), tone: 'error' })
        },
      },
    )
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4 rounded-kp border border-divider p-4"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" error={errors.firstName}>
          {(control) => <Input {...control} value={firstName} maxLength={100} onChange={(event) => setFirstName(event.target.value)} />}
        </Field>
        <Field label="Apellido" optional error={errors.lastName}>
          {(control) => <Input {...control} value={lastName} maxLength={100} onChange={(event) => setLastName(event.target.value)} />}
        </Field>
      </div>
      <p className="text-caption text-muted">El correo no se cambia desde aquí.</p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => onDone(null)} disabled={rename.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={rename.isPending}>
          Guardar nombre
        </Button>
      </div>
    </form>
  )
}

function ContextLink({
  label,
  title,
  detail,
  tag,
  to,
}: {
  label: string
  title: string
  detail: string
  tag?: ReactNode
  to?: string
}) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-small text-muted">{label}</span>
        <span className="block text-body font-semibold text-ink">{title}</span>
        <span className="block text-small text-muted">{detail}</span>
      </span>
      {tag}
      {to && <ArrowRight size={16} className="shrink-0 text-muted group-hover:text-ink" aria-hidden="true" />}
    </>
  )
  return to ? (
    <Link to={to} className="group flex items-center gap-3 rounded-kp border border-divider px-4 py-3 transition-colors duration-150 hover:border-ink/40">
      {body}
    </Link>
  ) : (
    <div className="flex items-center gap-3 rounded-kp border border-divider px-4 py-3">{body}</div>
  )
}
