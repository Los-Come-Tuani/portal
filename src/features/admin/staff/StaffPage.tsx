import { RotateCcw, Send, ShieldCheck, UserCog, UserPlus, UserX } from 'lucide-react'
import { useState } from 'react'
import { paths } from '@/app/router/paths'
import {
  Avatar,
  Button,
  ButtonLink,
  ConfirmDialog,
  ErrorState,
  IconButton,
  PageHeader,
  SkeletonRows,
  Table,
  Tag,
  Td,
  Th,
  Tr,
  useToast,
} from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useInviteStaff, useSetStaffStatus, useStaffMembers, useStaffRoles } from '@/data/hooks/use-users'
import { PERMISSION_INFO, USER_STATUS_LABELS, type StaffMember, type StaffRole } from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatDate, plural } from '@/lib/format'
import { USER_STATUS_TONES } from '../users/status'
import { ChangeRoleDialog } from './components/ChangeRoleDialog'
import { InviteSheet } from './components/InviteSheet'

function permissionSummary(role: StaffRole | undefined): string {
  if (!role) return 'Sin permisos'
  if (role.system) return 'Todo el portal'
  const labels = role.permissions.map((permission) => PERMISSION_INFO[permission].label)
  return labels.length <= 2 ? labels.join(' · ') : `${labels.slice(0, 2).join(' · ')} y ${labels.length - 2} más`
}

export function StaffPage() {
  useDocumentTitle('Equipo interno')
  const { user: me, can } = useSession()
  // Quitar o devolver el acceso es de "Administrar usuarios", aunque se haga desde el equipo.
  const canToggleAccess = can('users.manage')
  const staff = useStaffMembers()
  const roles = useStaffRoles()
  const setStatus = useSetStaffStatus()
  const reinvite = useInviteStaff()
  const toast = useToast()
  const [inviting, setInviting] = useState(false)
  const [changing, setChanging] = useState<StaffMember | null>(null)
  const [toggling, setToggling] = useState<StaffMember | null>(null)

  const people = staff.data ?? []
  const roleOf = (member: StaffMember) => roles.data?.find((role) => role.id === member.role?.id)
  const invited = people.filter((member) => member.status === 'invited').length
  const ordered = [...people].sort(
    (a, b) =>
      Number(b.id === me.id) - Number(a.id === me.id) ||
      Number(a.status === 'suspended') - Number(b.status === 'suspended') ||
      a.name.localeCompare(b.name, 'es'),
  )

  const toggleAccess = () => {
    if (!toggling) return
    const status = toggling.status === 'suspended' ? 'active' : 'suspended'
    setStatus.mutate(
      { userId: toggling.id, status },
      {
        onSuccess: () => {
          toast({ title: status === 'suspended' ? `${toggling.name} ya no entra al portal` : `${toggling.name} vuelve a tener acceso` })
          setToggling(null)
        },
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    )
  }

  /** Reinvitar a quien no ha aceptado le manda otro código; si se le escribió hace menos de un minuto, no. */
  const resend = (member: StaffMember) => {
    if (!member.role) return
    reinvite.mutate(
      { name: member.name, email: member.email, staffRoleId: member.role.id },
      {
        onSuccess: ({ sent }) =>
          toast(
            sent
              ? { title: 'Invitación reenviada', description: member.email }
              : { title: 'Le escribimos hace menos de un minuto', description: 'Que use el código del último correo.' },
          ),
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Equipo interno"
        description="Las personas de K'Plan que entran al portal. Cada una ve y hace sólo lo que permite su rol."
        actions={
          <>
            <ButtonLink to={paths.staffRoles} icon={<ShieldCheck size={16} />}>
              Roles y permisos
            </ButtonLink>
            <Button icon={<UserPlus size={16} />} onClick={() => setInviting(true)} disabled={!roles.data}>
              Invitar a alguien
            </Button>
          </>
        }
      />

      {staff.isSuccess && roles.isSuccess && (
        <p className="max-w-[84ch] text-lead text-muted">
          <strong className="font-semibold text-ink">{plural(people.length, 'persona', 'personas')}</strong> en el equipo, repartidas en{' '}
          <strong className="font-semibold text-ink">{plural(roles.data.length, 'rol', 'roles')}</strong>.
          {invited > 0 && (
            <>
              {' '}
              <strong className="font-semibold text-ink">{plural(invited, 'invitación', 'invitaciones')}</strong> todavía sin aceptar.
            </>
          )}
        </p>
      )}

      {staff.isPending || roles.isPending ? (
        <SkeletonRows rows={6} />
      ) : staff.isError ? (
        <ErrorState error={staff.error} onRetry={() => void staff.refetch()} />
      ) : (
        <Table id="equipo" caption="Equipo interno">
          <thead>
            <tr>
              <Th>Persona</Th>
              <Th>Rol</Th>
              <Th>Puede</Th>
              <Th>Estado</Th>
              <Th>En el equipo desde</Th>
              <Th resizable={false}>
                <span className="sr-only">Acciones</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((person) => {
              const role = roleOf(person)
              const isMe = person.id === me.id
              return (
                <Tr key={person.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={person.name} size="sm" />
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-semibold text-ink">
                          {person.name}
                          {isMe && <Tag tone="outline">Tú</Tag>}
                        </p>
                        <p className="truncate text-caption text-muted">{person.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    {role ? (
                      <Tag tone={role.system ? 'ink' : 'neutral'}>{role.name}</Tag>
                    ) : person.role === null ? (
                      // Un superusuario sin rol del equipo: tiene todo.
                      <Tag tone="ink">Superusuario</Tag>
                    ) : (
                      <span className="text-small text-danger">Sin rol</span>
                    )}
                  </Td>
                  <Td className="max-w-80 text-small text-muted">{person.role === null ? 'Todo el portal' : permissionSummary(role)}</Td>
                  <Td>
                    <Tag tone={USER_STATUS_TONES[person.status]}>{USER_STATUS_LABELS[person.status]}</Tag>
                  </Td>
                  <Td className="whitespace-nowrap text-muted tabular-nums">{formatDate(person.createdAt)}</Td>
                  <Td align="right">
                    {!isMe && person.role !== null && (
                      <div className="flex justify-end gap-0.5">
                        {person.status === 'invited' && (
                          <IconButton size="sm" label={`Reenviar la invitación a ${person.name}`} icon={<Send size={16} />} onClick={() => resend(person)} />
                        )}
                        <IconButton size="sm" label={`Cambiar el rol de ${person.name}`} icon={<UserCog size={16} />} onClick={() => setChanging(person)} />
                        {!canToggleAccess ? null : person.status === 'suspended' ? (
                          <IconButton size="sm" label={`Devolver el acceso a ${person.name}`} icon={<RotateCcw size={16} />} onClick={() => setToggling(person)} />
                        ) : (
                          person.status === 'active' && (
                            <IconButton
                              size="sm"
                              label={`Quitar el acceso a ${person.name}`}
                              icon={<UserX size={16} />}
                              onClick={() => setToggling(person)}
                              tone="danger"
                            />
                          )
                        )}
                      </div>
                    )}
                  </Td>
                </Tr>
              )
            })}
          </tbody>
        </Table>
      )}

      <InviteSheet open={inviting} roles={roles.data ?? []} onClose={() => setInviting(false)} />
      <ChangeRoleDialog person={changing} roles={roles.data ?? []} onClose={() => setChanging(null)} />
      <ConfirmDialog
        open={toggling !== null}
        tone={toggling?.status === 'suspended' ? 'primary' : 'danger'}
        title={toggling?.status === 'suspended' ? `Devolver el acceso a ${toggling.name}` : `Quitar el acceso a ${toggling?.name ?? ''}`}
        confirmLabel={toggling?.status === 'suspended' ? 'Devolver acceso' : 'Quitar acceso'}
        loading={setStatus.isPending}
        onClose={() => setToggling(null)}
        onConfirm={toggleAccess}
      >
        {toggling?.status === 'suspended'
          ? 'Vuelve a entrar con su rol de antes.'
          : 'Deja de entrar al portal de inmediato y se cierran sus sesiones. Lo que hizo queda en los historiales con su nombre.'}
      </ConfirmDialog>
    </div>
  )
}
