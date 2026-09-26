import { ChevronsUpDown, LogOut } from 'lucide-react'
import { Link, NavLink } from 'react-router'
import { Logo } from '@/components/brand/Logo'
import { Avatar, Menu, MenuItem } from '@/components/ui'
import { ROLE_LABELS } from '@/data/models'
import { useAuth, useSession } from '@/features/auth/use-auth'
import { cn } from '@/lib/cn'
import { paths } from '../router/paths'
import { navigationFor } from './navigation'

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const session = useSession()
  const { logout } = useAuth()
  const items = navigationFor(session)

  return (
    <div className="flex h-full flex-col">
      <Link to={paths.home} onClick={onNavigate} className="flex h-16 items-center px-5" aria-label="K'Plan, ir a la agenda">
        <Logo className="h-9 text-ink" />
      </Link>

      <nav aria-label="Principal" className="flex-1 overflow-y-auto px-3 pt-2 pb-4">
        <ul className="flex flex-col gap-0.5">
          {items.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group flex h-10 items-center gap-3 rounded-kp px-3 text-body font-medium transition-colors duration-150',
                    isActive ? 'bg-ink text-canvas' : 'text-ink/80 hover:bg-paper-deep hover:text-ink',
                  )
                }
              >
                <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-outline/60 p-3">
        <Menu
          side="top"
          align="start"
          className="w-full"
          trigger={(props) => (
            <button
              type="button"
              {...props}
              className="flex w-full items-center gap-3 rounded-kp p-2 text-left transition-colors duration-150 hover:bg-paper-deep"
            >
              <Avatar name={session.user.name} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-small font-semibold text-ink">{session.user.name}</span>
                <span className="block truncate text-caption text-muted">
                  {session.organization?.name ?? ROLE_LABELS[session.role]}
                </span>
              </span>
              <ChevronsUpDown size={16} className="shrink-0 text-muted" aria-hidden="true" />
            </button>
          )}
        >
          {(close) => (
            <>
              <div className="px-2.5 pt-1.5 pb-2">
                <p className="text-small font-semibold text-ink">{session.user.email}</p>
                <p className="text-caption text-muted">{ROLE_LABELS[session.role]}</p>
              </div>
              <MenuItem
                icon={<LogOut size={16} />}
                onSelect={() => {
                  close()
                  logout()
                }}
              >
                Cerrar sesión
              </MenuItem>
            </>
          )}
        </Menu>
      </div>
    </div>
  )
}
