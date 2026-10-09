import { ArrowRight, Check, Lock, Pencil, Plus, ShieldCheck, Users } from 'lucide-react'
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { paths } from '@/app/router/paths'
import { Button, ButtonLink, EmptyState, ErrorState, PageHeader, SkeletonRows } from '@/components/ui'
import { useStaffMembers, useStaffRoles } from '@/data/hooks/use-users'
import { PERMISSION_GROUPS, type StaffRole } from '@/data/models'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { plural } from '@/lib/format'
import { RoleSheet } from './components/RoleSheet'

/** La tabla se desplaza de lado cuando hay muchos roles; si queda algo a la derecha, se nota. */
function ScrollHint({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => setMore(element.scrollLeft + element.clientWidth < element.scrollWidth - 4)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    element.addEventListener('scroll', measure, { passive: true })
    return () => {
      observer.disconnect()
      element.removeEventListener('scroll', measure)
    }
  }, [])

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-2">
      {more && (
        <p className="flex items-center justify-end gap-1.5 text-small text-muted">
          Hay más roles a la derecha
          <ArrowRight size={14} aria-hidden="true" />
        </p>
      )}
      <div className="relative">
        <div ref={ref} className="relative min-w-0 max-w-full overflow-x-auto rounded-panel border border-divider bg-surface">
          {children}
        </div>
        {more && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-px right-px w-12 rounded-r-kp bg-linear-to-l from-surface to-transparent"
          />
        )}
      </div>
    </div>
  )
}

export function RolesPage() {
  useDocumentTitle('Roles y permisos')
  const roles = useStaffRoles()
  const staff = useStaffMembers()
  const [editing, setEditing] = useState<StaffRole | 'nuevo' | null>(null)

  const all = roles.data ?? []
  const membersOf = (role: StaffRole) => role.members
  // El rol recién leído: asignarle a alguien cambia cuántas personas tiene.
  const current = editing === 'nuevo' || editing === null ? null : (all.find((role) => role.id === editing.id) ?? editing)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Roles y permisos"
        description="Cada rol es un conjunto de permisos. A cada persona del equipo le toca un rol, y el portal le muestra sólo lo que ese rol permite. Abre un rol para ver quiénes lo tienen y dárselo a alguien."
        actions={
          <>
            <ButtonLink to={paths.staff} icon={<Users size={16} />}>
              Equipo interno
            </ButtonLink>
            <Button icon={<Plus size={16} />} onClick={() => setEditing('nuevo')}>
              Nuevo rol
            </Button>
          </>
        }
      />

      {roles.isSuccess && staff.isSuccess && (
        <p className="max-w-[72ch] text-lead text-muted">
          <strong className="font-semibold text-ink">{plural(all.length, 'rol', 'roles')}</strong> para{' '}
          <strong className="font-semibold text-ink">{plural(staff.data.filter((member) => member.status !== 'suspended').length, 'persona', 'personas')}</strong>.
          Cada columna es un rol: toca su nombre para ver a quién se le dio, dárselo a alguien o cambiarle los permisos.
        </p>
      )}

      {roles.isPending ? (
        <SkeletonRows rows={8} />
      ) : roles.isError ? (
        <ErrorState error={roles.error} onRetry={() => void roles.refetch()} />
      ) : all.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck size={20} />}
          title="Todavía no hay roles"
          action={
            <Button icon={<Plus size={16} />} onClick={() => setEditing('nuevo')}>
              Nuevo rol
            </Button>
          }
        >
          Arma un rol con los permisos que necesita cada parte del equipo y después dáselo a quien corresponda.
        </EmptyState>
      ) : (
        <ScrollHint>
          <table className="w-full border-collapse text-left text-body">
            <caption className="sr-only">Permisos de cada rol</caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 min-w-48 border-b border-divider bg-canvas px-5 py-4 align-bottom text-small font-semibold text-ink"
                >
                  Permiso
                </th>
                {all.map((role) => (
                  <th key={role.id} scope="col" className="w-28 min-w-28 border-b border-l border-divider bg-canvas px-3 py-4 align-bottom font-normal">
                    {role.system ? (
                      <button
                        type="button"
                        onClick={() => setEditing(role)}
                        aria-label={`Ver quiénes tienen el rol ${role.name}`}
                        className="group -mx-2 -my-1.5 flex min-h-11 flex-col gap-0.5 rounded-sm px-2 py-1.5 text-left transition-colors duration-150 hover:bg-canvas"
                      >
                        <span className="flex items-center gap-1.5 text-small font-semibold text-ink">
                          <Lock size={13} className="text-muted" aria-hidden="true" />
                          {role.name}
                        </span>
                        <span className="text-caption text-muted tabular-nums">
                          {plural(membersOf(role), 'persona', 'personas')} · permisos fijos
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditing(role)}
                        aria-label={`Editar el rol ${role.name}`}
                        className="group -mx-2 -my-1.5 flex min-h-11 flex-col gap-0.5 rounded-sm px-2 py-1.5 text-left transition-colors duration-150 hover:bg-canvas"
                      >
                        <span className="flex items-center gap-1.5 text-small font-semibold text-ink">
                          {role.name}
                          <Pencil size={12} className="text-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
                        </span>
                        <span className="text-caption text-muted tabular-nums">{plural(membersOf(role), 'persona', 'personas')}</span>
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map((group) => (
                <Fragment key={group.label}>
                  <tr>
                    <th
                      scope="rowgroup"
                      colSpan={all.length + 1}
                      className="border-b border-divider bg-canvas px-5 py-2 text-left text-small font-semibold text-ink"
                    >
                      <span className="sticky left-5">{group.label}</span>
                    </th>
                  </tr>
                  {group.permissions.map((permission) => (
                    <tr key={permission.id} className="transition-colors duration-150 hover:bg-canvas/50">
                      <th scope="row" className="sticky left-0 z-10 border-b border-divider bg-surface px-5 py-3 text-left font-normal">
                        <span className="block text-body font-medium text-ink">{permission.label}</span>
                        <span className="block max-w-[38ch] text-caption text-muted">{permission.description}</span>
                      </th>
                      {all.map((role) => {
                        const granted = role.permissions.includes(permission.id)
                        return (
                          <td key={role.id} className="border-b border-l border-divider px-3 py-3 text-center">
                            {granted ? (
                              <span className="inline-flex size-6 items-center justify-center rounded-full bg-ink text-canvas">
                                <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                                <span className="sr-only">Sí</span>
                              </span>
                            ) : (
                              <span className="inline-block size-1.5 rounded-full bg-outline">
                                <span className="sr-only">No</span>
                              </span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </ScrollHint>
      )}

      <RoleSheet
        open={editing !== null}
        role={current}
        members={current ? membersOf(current) : 0}
        roles={all}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}
