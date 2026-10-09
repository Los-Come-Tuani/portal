import { Search, UserCog } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { Avatar, Button, InlineError, Input, SkeletonRows, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useAccounts, useSetStaffRole, useStaffMembers } from '@/data/hooks/use-users'
import { USER_STATUS_LABELS, type Account, type StaffMember, type StaffRole } from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { whyNotTeam } from '../team'
import { ChangeRoleDialog } from './ChangeRoleDialog'

/** Quiénes tienen el rol y a quién dárselo: alguien del equipo o una cuenta que ya existe. */
export function RoleMembers({ role, roles }: { role: StaffRole; roles: readonly StaffRole[] }) {
  const { user: me, can } = useSession()
  const staff = useStaffMembers()
  const setRole = useSetStaffRole()
  const toast = useToast()
  const [changing, setChanging] = useState<StaffMember | null>(null)
  const [search, setSearch] = useState('')
  const term = useDeferredValue(search.trim())
  const searching = term.length >= 2
  const found = useAccounts({ search: term, pageSize: 6 }, searching)
  const members = (staff.data ?? []).filter((member) => member.role?.id === role.id)

  const give = (account: Account) =>
    setRole.mutate(
      { userId: account.id, roleId: role.id },
      {
        onSuccess: () => {
          toast({ title: account.staffRole ? `${account.name} ahora es ${role.name}` : `${account.name} entró al equipo como ${role.name}` })
          setSearch('')
        },
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    )

  return (
    <section aria-labelledby="personas-del-rol" className="flex flex-col gap-3">
      <h3 id="personas-del-rol" className="text-small font-semibold text-ink">
        Personas con este rol
      </h3>

      {staff.isPending ? (
        <SkeletonRows rows={2} />
      ) : staff.isError ? (
        <InlineError error={staff.error} onRetry={() => void staff.refetch()} />
      ) : members.length === 0 ? (
        <p className="text-small text-muted">Nadie tiene este rol todavía.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-divider rounded-kp border border-divider bg-surface">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-3 px-4 py-2.5">
              <Avatar name={member.name} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-ink">
                  {member.name}
                  {member.id === me.id && <span className="font-normal text-muted"> (tú)</span>}
                </span>
                <span className="block truncate text-caption text-muted">
                  {member.email}
                  {member.status !== 'active' && ` · ${USER_STATUS_LABELS[member.status]}`}
                </span>
              </span>
              {member.id !== me.id && (
                <Button size="sm" variant="ghost" icon={<UserCog size={15} />} onClick={() => setChanging(member)}>
                  Cambiar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Input
        aria-label="Buscar a quién darle este rol"
        placeholder="Darle este rol a alguien: nombre o correo"
        leading={<Search size={15} aria-hidden="true" />}
        value={search}
        onChange={(change) => setSearch(change.target.value)}
      />
      {searching &&
        (found.isPending ? (
          <SkeletonRows rows={2} />
        ) : found.isError ? (
          <InlineError error={found.error} onRetry={() => void found.refetch()} />
        ) : found.data.results.length === 0 ? (
          <p className="text-small text-muted">Ninguna cuenta coincide.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-divider rounded-kp border border-divider bg-surface" aria-label="Cuentas que coinciden">
            {found.data.results.map((account) => {
              const reason = whyNotTeam(account)
              const has = account.staffRole?.id === role.id
              return (
                <li key={account.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{account.name}</span>
                    <span className="block truncate text-caption text-muted">
                      {account.email}
                      {account.staffRole && !has && ` · hoy es ${account.staffRole.name}`}
                    </span>
                    {reason && !has && <span className="block text-caption text-muted">{reason}</span>}
                  </span>
                  {has ? (
                    <span className="shrink-0 text-caption text-muted">Ya tiene este rol</span>
                  ) : account.id === me.id ? (
                    <span className="shrink-0 text-caption text-muted">Eres tú</span>
                  ) : (
                    !reason && (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={setRole.isPending && setRole.variables?.userId === account.id}
                        onClick={() => give(account)}
                      >
                        {account.staffRole ? 'Pasar a este rol' : 'Darle el rol'}
                      </Button>
                    )
                  )}
                </li>
              )
            })}
          </ul>
        ))}
      {!can('users.view') && (
        <p className="text-caption text-muted">Tu rol solo ve las cuentas del equipo. A alguien de afuera, invítalo desde Equipo interno.</p>
      )}

      <ChangeRoleDialog person={changing} roles={roles} onClose={() => setChanging(null)} />
    </section>
  )
}
