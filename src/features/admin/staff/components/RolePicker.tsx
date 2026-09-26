import { PERMISSION_INFO, type StaffRole } from '@/data/models'
import { cn } from '@/lib/cn'

interface RolePickerProps {
  roles: readonly StaffRole[]
  value: string
  onChange: (roleId: string) => void
  name: string
  invalid?: boolean
}

/** Un rol por tarjeta, con lo que permite hacer, para elegir sin adivinar. */
export function RolePicker({ roles, value, onChange, name, invalid }: RolePickerProps) {
  return (
    <div role="radiogroup" aria-invalid={invalid || undefined} className="flex flex-col gap-2">
      {roles.map((role) => {
        const selected = role.id === value
        return (
          <label
            key={role.id}
            className={cn(
              'flex cursor-pointer gap-3 rounded-kp border px-4 py-3 transition-colors duration-150',
              selected ? 'border-ink bg-surface shadow-[inset_0_0_0_1px_var(--color-ink)]' : 'border-divider bg-surface hover:border-ink/40',
            )}
          >
            <input
              type="radio"
              name={name}
              value={role.id}
              checked={selected}
              onChange={() => onChange(role.id)}
              className="mt-1 size-4 shrink-0 cursor-pointer accent-ink"
            />
            <span className="min-w-0">
              <span className="block text-body font-semibold text-ink">{role.name}</span>
              <span className="block text-small text-muted">{role.description}</span>
              <span className="mt-1 block text-caption text-muted">
                {role.system ? 'Todos los permisos' : role.permissions.map((permission) => PERMISSION_INFO[permission].label).join(' · ')}
              </span>
            </span>
          </label>
        )
      })}
    </div>
  )
}
