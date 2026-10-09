import { ChevronDown, ChevronsUpDown, LogOut, PanelLeftClose, PanelLeftOpen, ShieldCheck } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FocusEvent, type MouseEvent } from 'react'
import { Link, matchPath, NavLink, useLocation, useNavigate } from 'react-router'
import { Logo } from '@/components/brand/Logo'
import { Avatar, Menu, MenuItem } from '@/components/ui'
import { usePendingDemoCount } from '@/data/hooks/use-landing'
import { useOpenProviderCount } from '@/data/hooks/use-providers'
import { useOpenRequestCount } from '@/data/hooks/use-verification'
import { usePlaceRequests } from '@/data/hooks/use-place-requests'
import { ROLE_LABELS } from '@/data/models'
import { useAuth, useSession } from '@/features/auth/use-auth'
import { cn } from '@/lib/cn'
import { paths } from '../router/paths'
import { navigationFor, type NavChild, type NavCount, type NavGroupEntry, type NavLinkEntry } from './navigation'
import type { useSidebarPreferences } from './use-sidebar-preferences'

type Preferences = ReturnType<typeof useSidebarPreferences>

interface SidebarContentProps {
  preferences: Preferences
  /** En escritorio la barra se contrae; en el cajón del celular siempre va extendida. */
  collapsible?: boolean
  onNavigate?: () => void
}

/** Lo que flota junto a un ícono con la barra contraída. */
type Floating = { kind: 'hint'; label: string; top: number } | { kind: 'group'; group: NavGroupEntry; top: number; trigger: HTMLElement }

interface HintProps {
  onMouseEnter?: (event: MouseEvent<HTMLElement>) => void
  onFocus?: (event: FocusEvent<HTMLElement>) => void
  onMouseLeave?: () => void
  onBlur?: () => void
}

const ITEM =
  'group/item relative flex h-11 w-full items-center gap-3 rounded-kp pr-3 pl-3.75 text-left text-body font-medium transition-colors duration-150'
const IDLE = 'text-ink/80 hover:bg-canvas hover:text-ink'
const ACTIVE = 'bg-ink text-canvas'

function isActive(pathname: string, item: { to: string; end?: boolean }): boolean {
  return matchPath({ path: item.to, end: item.end ?? false }, pathname) !== null
}

function usePendingCounts(): Record<NavCount, number> {
  const { can } = useSession()
  const guides = useOpenProviderCount(can('guides.view'))
  const reviewsOrganizations = can('organizations.view')
  const openRequests = useOpenRequestCount(reviewsOrganizations)
  const placeRequests = usePlaceRequests({ status: 'pending' }, reviewsOrganizations)
  const demos = usePendingDemoCount(can('demos.view'))
  return {
    pendingGuides: guides ?? 0,
    pendingAdmissions: (openRequests ?? 0) + (placeRequests.data?.length ?? 0),
    pendingDemos: demos ?? 0,
  }
}

export function SidebarContent({ preferences, collapsible = false, onNavigate }: SidebarContentProps) {
  const session = useSession()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const counts = usePendingCounts()
  const entries = navigationFor(session)
  const collapsed = collapsible && preferences.collapsed
  const [floating, setFloating] = useState<Floating | null>(null)
  const flyoutRef = useRef<HTMLDivElement>(null)

  const [previous, setPrevious] = useState({ collapsed, pathname })
  if (previous.collapsed !== collapsed || previous.pathname !== pathname) {
    setPrevious({ collapsed, pathname })
    setFloating(null)
  }

  useEffect(() => {
    if (floating?.kind !== 'group') return
    const trigger = floating.trigger
    flyoutRef.current?.querySelector<HTMLElement>('a')?.focus()
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (!flyoutRef.current?.contains(target) && !trigger.contains(target)) setFloating(null)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setFloating(null)
      trigger.focus()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [floating])

  const hintProps = (label: string): HintProps =>
    collapsed
      ? {
          onMouseEnter: (event: MouseEvent<HTMLElement>) => showHint(label, event.currentTarget),
          onFocus: (event: FocusEvent<HTMLElement>) => showHint(label, event.currentTarget),
          onMouseLeave: hideHint,
          onBlur: hideHint,
        }
      : {}

  function showHint(label: string, element: HTMLElement) {
    setFloating((current) => {
      if (current?.kind === 'group') return current
      const rect = element.getBoundingClientRect()
      return { kind: 'hint', label, top: rect.top + rect.height / 2 }
    })
  }

  function hideHint() {
    setFloating((current) => (current?.kind === 'hint' ? null : current))
  }

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex h-18 shrink-0 items-center overflow-hidden pl-6.75">
        <Link
          to={paths.home}
          onClick={onNavigate}
          aria-label="K'Plan, ir al inicio"
          tabIndex={collapsed ? -1 : undefined}
          aria-hidden={collapsed || undefined}
          className={cn('flex min-h-11 shrink-0 items-center transition-opacity duration-150', collapsed && 'pointer-events-none opacity-0')}
        >
          <Logo className="h-9 text-ink" />
        </Link>
        {collapsible && (
          <button
            type="button"
            onClick={preferences.toggleCollapsed}
            aria-label={collapsed ? 'Extender el menú' : 'Contraer el menú'}
            aria-expanded={!collapsed}
            aria-controls="menu-principal"
            {...hintProps('Extender el menú')}
            className="absolute top-3.5 right-3.5 flex size-11 items-center justify-center rounded-kp text-ink/80 transition-colors duration-150 hover:bg-canvas hover:text-ink [&>.lucide]:size-5 [&>.lucide]:stroke-2"
          >
            {collapsed ? (
              <PanelLeftOpen size={19} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={19} strokeWidth={1.75} aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      <nav id="menu-principal" aria-label="Principal" className="flex-1 overflow-x-hidden overflow-y-auto px-3 pt-2 pb-4">
        <ul className="flex flex-col gap-1">
          {entries.map((entry) =>
            entry.kind === 'link' ? (
              <li key={entry.to}>
                <SidebarLink
                  entry={entry}
                  count={entry.count ? counts[entry.count] : 0}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                  hint={hintProps(entry.label)}
                />
              </li>
            ) : (
              <li key={entry.id}>
                <SidebarGroup
                  group={entry}
                  counts={counts}
                  pathname={pathname}
                  collapsed={collapsed}
                  open={preferences.groups[entry.id] ?? entry.children.some((child) => isActive(pathname, child))}
                  flyoutOpen={floating?.kind === 'group' && floating.group.id === entry.id}
                  onToggle={(open) => preferences.setGroupOpen(entry.id, open)}
                  onFlyout={(trigger) => {
                    const height = 52 + entry.children.length * 38
                    const top = Math.min(trigger.getBoundingClientRect().top, window.innerHeight - height - 12)
                    setFloating((current) =>
                      current?.kind === 'group' && current.group.id === entry.id ? null : { kind: 'group', group: entry, top, trigger },
                    )
                  }}
                  onNavigate={onNavigate}
                  hint={hintProps(entry.label)}
                />
              </li>
            ),
          )}
        </ul>
      </nav>

      <div className="border-t border-divider p-3">
        <Menu
          side="top"
          align="start"
          className="w-full"
          trigger={(props) => (
            <button
              type="button"
              {...props}
              aria-label={collapsed ? `Tu cuenta: ${session.user.name}` : undefined}
              {...hintProps(session.user.name)}
              className="flex w-full items-center gap-3 overflow-hidden rounded-kp p-1.5 text-left transition-colors duration-150 hover:bg-canvas"
            >
              <Avatar name={session.user.name} />
              <span className={cn('min-w-0 flex-1 transition-opacity duration-150', collapsed && 'opacity-0')}>
                <span className="block truncate text-small font-semibold text-ink">{session.user.name}</span>
                <span className="block truncate text-caption text-muted">
                  {session.organization?.name ?? session.user.staffRoleName ?? ROLE_LABELS[session.role]}
                </span>
              </span>
              <ChevronsUpDown
                size={16}
                className={cn('shrink-0 text-muted transition-opacity duration-150', collapsed && 'opacity-0')}
                aria-hidden="true"
              />
            </button>
          )}
        >
          {(close) => (
            <>
              <div className="px-2.5 pt-1.5 pb-2">
                <p className="text-small font-semibold text-ink">{session.user.name}</p>
                <p className="text-caption text-muted">{session.user.email}</p>
                <p className="mt-1 text-caption text-muted">
                  {session.user.staffRoleName
                    ? `${ROLE_LABELS[session.role]} · ${session.user.staffRoleName}`
                    : ROLE_LABELS[session.role]}
                </p>
              </div>
              <MenuItem
                icon={<ShieldCheck size={16} />}
                onSelect={() => {
                  close()
                  navigate(paths.security)
                  onNavigate?.()
                }}
              >
                Seguridad
              </MenuItem>
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

      {floating?.kind === 'hint' && (
        <span
          aria-hidden="true"
          style={{ top: floating.top }}
          className="pointer-events-none fixed left-20 z-50 -translate-y-1/2 animate-fade rounded-sm bg-ink px-2 py-1 text-caption font-semibold whitespace-nowrap text-canvas shadow-pop"
        >
          {floating.label}
        </span>
      )}
      {floating?.kind === 'group' && (
        <div
          ref={flyoutRef}
          id={`submenu-${floating.group.id}`}
          role="group"
          aria-label={floating.group.label}
          style={{ top: floating.top }}
          className="fixed bottom-3 left-20 z-50 max-h-max min-w-52 animate-rise overflow-y-auto rounded-panel border border-divider bg-surface p-1.5 shadow-pop"
        >
          <p className="px-2.5 pt-1 pb-1.5 text-small font-semibold text-ink">{floating.group.label}</p>
          <ul className="flex flex-col gap-1">
            {floating.group.children.map((child) => (
              <li key={child.to}>
                <NavLink
                  to={child.to}
                  end={child.end}
                  onClick={() => {
                    setFloating(null)
                    onNavigate?.()
                  }}
                  className={({ isActive: active }) =>
                    cn(
                      'flex min-h-11 items-center justify-between gap-3 rounded-sm px-2.5 text-body transition-colors duration-150 focus-visible:-outline-offset-2',
                      active ? ACTIVE : 'text-ink hover:bg-canvas',
                    )
                  }
                >
                  {({ isActive: active }) => (
                    <>
                      {child.label}
                      {child.count && counts[child.count] > 0 && <Count value={counts[child.count]} active={active} />}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Count({ value, active }: { value: number; active: boolean }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-sm px-1.5 text-caption font-semibold tabular-nums',
        active ? 'bg-canvas/15 text-canvas' : 'bg-planned/12 text-planned',
      )}
    >
      {value}
    </span>
  )
}

function SidebarLink({
  entry,
  count,
  collapsed,
  onNavigate,
  hint,
}: {
  entry: NavLinkEntry
  count: number
  collapsed: boolean
  onNavigate?: () => void
  hint: HintProps
}) {
  const { to, end, label, icon: Icon } = entry
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      aria-label={collapsed ? (count > 0 ? `${label}, ${count} pendientes` : label) : undefined}
      {...hint}
      className={({ isActive: active }) => cn(ITEM, active ? ACTIVE : IDLE)}
    >
      {({ isActive: active }) => (
        <>
          <Icon size={18} strokeWidth={1.75} className="size-5 shrink-0 stroke-2" aria-hidden="true" />
          <span className={cn('min-w-0 flex-1 truncate transition-opacity duration-150', collapsed && 'opacity-0')}>{label}</span>
          {count > 0 &&
            (collapsed ? (
              <span aria-hidden="true" className="absolute top-2 left-7.5 size-2 rounded-full bg-planned ring-2 ring-paper" />
            ) : (
              <Count value={count} active={active} />
            ))}
        </>
      )}
    </NavLink>
  )
}

function SidebarGroup({
  group,
  counts,
  pathname,
  collapsed,
  open,
  flyoutOpen,
  onToggle,
  onFlyout,
  onNavigate,
  hint,
}: {
  group: NavGroupEntry
  counts: Record<NavCount, number>
  pathname: string
  collapsed: boolean
  open: boolean
  flyoutOpen: boolean
  onToggle: (open: boolean) => void
  onFlyout: (trigger: HTMLElement) => void
  onNavigate?: () => void
  hint: HintProps
}) {
  const listId = useId()
  const { label, icon: Icon, children } = group
  const activeInside = children.some((child) => isActive(pathname, child))
  const expanded = open && !collapsed
  const highlight = activeInside && (collapsed || !open)
  const pending = children.reduce((sum, child) => sum + (child.count ? counts[child.count] : 0), 0)

  return (
    <>
      <button
        type="button"
        onClick={(event) => (collapsed ? onFlyout(event.currentTarget) : onToggle(!open))}
        aria-expanded={collapsed ? flyoutOpen : open}
        aria-controls={collapsed ? (flyoutOpen ? `submenu-${group.id}` : undefined) : listId}
        aria-label={collapsed ? (pending > 0 ? `${label}, ${pending} pendientes` : label) : undefined}
        {...(flyoutOpen ? {} : hint)}
        className={cn(ITEM, highlight ? ACTIVE : activeInside ? 'text-ink hover:bg-canvas' : IDLE, flyoutOpen && !highlight && 'bg-paper-deep')}
      >
        <Icon size={18} strokeWidth={1.75} className="size-5 shrink-0 stroke-2" aria-hidden="true" />
        <span className={cn('min-w-0 flex-1 truncate transition-opacity duration-150', collapsed && 'opacity-0')}>{label}</span>
        {pending > 0 &&
          (collapsed ? (
            <span aria-hidden="true" className="absolute top-2 left-7.5 size-2 rounded-full bg-planned ring-2 ring-paper" />
          ) : (
            !open && <Count value={pending} active={highlight} />
          ))}
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={cn(
            'shrink-0 transition-[transform,opacity] duration-200 ease-out-expo',
            open && 'rotate-180',
            highlight ? 'text-canvas/70' : 'text-muted',
            collapsed && 'opacity-0',
          )}
        />
      </button>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out-expo',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <ul id={listId} inert={!expanded} className="ml-6 min-h-0 overflow-hidden border-l border-outline/70">
          {children.map((child) => (
            <li key={child.to} className="py-px first:pt-1 last:pb-1">
              <SubLink child={child} count={child.count ? counts[child.count] : 0} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

function SubLink({ child, count, onNavigate }: { child: NavChild; count: number; onNavigate?: () => void }) {
  return (
    <NavLink
      to={child.to}
      end={child.end}
      onClick={onNavigate}
      className={({ isActive: active }) =>
        cn(
          'ml-2 flex min-h-11 items-center justify-between gap-2 rounded-kp px-3 text-body transition-colors duration-150',
          active ? cn(ACTIVE, 'font-medium') : 'text-ink/75 hover:bg-canvas hover:text-ink',
        )
      }
    >
      {({ isActive: active }) => (
        <>
          <span className="truncate">{child.label}</span>
          {count > 0 && <Count value={count} active={active} />}
        </>
      )}
    </NavLink>
  )
}
