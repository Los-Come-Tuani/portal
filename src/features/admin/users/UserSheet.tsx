import { ArrowRight, KeyRound, Mail, Phone } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { paths } from '@/app/router/paths'
import { Avatar, Button, ConfirmDialog, Dialog, Tag, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useSendPasswordReset, useUpdateUser } from '@/data/hooks/use-users'
import {
  PROVIDER_STAGE_LABELS,
  REQUEST_STATUS_LABELS,
  USER_STATUS_LABELS,
  type Organization,
  type ProviderRequestSummary,
  type RequestStatus,
  type StaffRole,
  type User,
} from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { cn } from '@/lib/cn'
import { nowLocalDateTime } from '@/lib/dates'
import { formatDate, formatDateTime } from '@/lib/format'
import { SUSPEND_EFFECT, USER_STATUS_TONES, userKind, usesApp } from './status'

const APPLICATION_DOT: Record<RequestStatus, string> = {
  submitted: 'border border-ink/40',
  in_review: 'bg-planned',
  approved: 'bg-confirmed',
  rejected: 'bg-danger',
}

interface UserSheetProps {
  user: User | null
  organization: Organization | undefined
  staffRole: StaffRole | undefined
  /** Su solicitud de guía o traductor más reciente. */
  application: ProviderRequestSummary | undefined
  onClose: () => void
}

export function UserSheet({ user, organization, staffRole, application, onClose }: UserSheetProps) {
  const session = useSession()
  const update = useUpdateUser()
  const reset = useSendPasswordReset()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)

  const isSelf = user?.id === session.user.id
  const canManage = !!user && !isSelf && (user.role === 'admin' ? session.can('staff.manage') : session.can('users.manage'))
  const suspended = user?.status === 'suspended'

  const changeStatus = () => {
    if (!user) return
    const status = suspended ? 'active' : 'suspended'
    update.mutate(
      { id: user.id, input: { status } },
      {
        onSuccess: () => {
          setConfirming(false)
          toast({ title: status === 'suspended' ? `Suspendiste la cuenta de ${user.name}` : `Reactivaste la cuenta de ${user.name}` })
          onClose()
        },
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    )
  }

  const sendReset = () => {
    if (!user) return
    reset.mutate(user.id, {
      onSuccess: () => toast({ title: 'Enlace enviado', description: `Le llegó a ${user.email} para crear una contraseña nueva.` }),
      onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
    })
  }

  return (
    <Dialog
      open={user !== null}
      onClose={onClose}
      variant="sheet"
      title={user?.name ?? ''}
      description={user ? `${userKind(user)} · ${usesApp(user) ? 'usa la app' : 'entra al portal'}` : undefined}
      footer={
        user &&
        (canManage ? (
          <>
            <Button variant="ghost" icon={<KeyRound size={16} />} loading={reset.isPending} onClick={sendReset} className="mr-auto">
              Enviar enlace de contraseña
            </Button>
            {suspended ? (
              <Button onClick={() => setConfirming(true)}>Reactivar cuenta</Button>
            ) : (
              <Button variant="danger" onClick={() => setConfirming(true)}>
                Suspender cuenta
              </Button>
            )}
          </>
        ) : (
          <p className="mr-auto text-small text-muted">
            {isSelf ? 'Es tu cuenta: los cambios los hace otra persona con permiso.' : 'Tu rol puede verla, pero no cambiarla.'}
          </p>
        ))
      }
    >
      {user && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Avatar name={user.name} size="lg" />
            <div className="flex flex-wrap items-center gap-2">
              <Tag tone={USER_STATUS_TONES[user.status]}>{USER_STATUS_LABELS[user.status]}</Tag>
              {staffRole && <Tag tone="ink">{staffRole.name}</Tag>}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-body">
            <div className="col-span-2">
              <dt className="text-small text-muted">Correo</dt>
              <dd className="flex items-center gap-2 text-ink">
                <Mail size={15} className="text-muted" aria-hidden="true" />
                <a href={`mailto:${user.email}`} className="truncate underline decoration-outline underline-offset-4 hover:decoration-ink">
                  {user.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-small text-muted">Teléfono</dt>
              <dd className="flex items-center gap-2 text-ink tabular-nums">
                <Phone size={15} className="text-muted" aria-hidden="true" />
                {user.phone || 'No lo dejó'}
              </dd>
            </div>
            <div>
              <dt className="text-small text-muted">Ciudad</dt>
              <dd className="text-ink">{user.city ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-small text-muted">Cuenta creada</dt>
              <dd className="text-ink tabular-nums">{formatDate(user.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-small text-muted">Último acceso</dt>
              <dd className="text-ink tabular-nums">{user.lastSeenAt ? formatDateTime(user.lastSeenAt) : 'Todavía no entra'}</dd>
            </div>
          </dl>

          {organization && (
            <ContextLink
              label="Organización"
              title={organization.name}
              detail={`${organization.kind} · ${organization.city}`}
              to={session.can('organizations.review', 'organizations.manage') ? paths.organization(organization.id) : undefined}
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
          {staffRole && (
            <ContextLink
              label="Rol interno"
              title={staffRole.name}
              detail={staffRole.description}
              to={session.can('staff.manage') ? paths.staff : undefined}
            />
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        tone={suspended ? 'primary' : 'danger'}
        title={suspended ? `Reactivar a ${user?.name}` : `Suspender a ${user?.name}`}
        confirmLabel={suspended ? 'Reactivar' : 'Suspender'}
        loading={update.isPending}
        onClose={() => setConfirming(false)}
        onConfirm={changeStatus}
      >
        {user && (suspended ? 'Vuelve a entrar con su correo y contraseña de siempre.' : SUSPEND_EFFECT[user.role])}
      </ConfirmDialog>
    </Dialog>
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
