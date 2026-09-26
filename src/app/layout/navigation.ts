import {
  BadgeCheck,
  Building2,
  CalendarDays,
  CalendarHeart,
  FileCheck2,
  Layers,
  MapPin,
  Medal,
  Receipt,
  TicketPercent,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { Session } from '@/features/auth/use-auth'
import { paths } from '../router/paths'

/** Un número que la barra lateral busca y muestra junto al módulo. */
export type NavCount = 'pendingGuides' | 'pendingAdmissions'

export interface NavLinkEntry {
  kind: 'link'
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  count?: NavCount
}

export interface NavChild {
  to: string
  label: string
  end?: boolean
  count?: NavCount
}

export interface NavGroupEntry {
  kind: 'group'
  id: string
  label: string
  icon: LucideIcon
  children: NavChild[]
}

export type NavEntry = NavLinkEntry | NavGroupEntry

const link = (to: string, label: string, icon: LucideIcon, extra: Partial<NavLinkEntry> = {}): NavLinkEntry => ({
  kind: 'link',
  to,
  label,
  icon,
  ...extra,
})

/** Un grupo sin submódulos desaparece; con uno solo, es un enlace directo. */
function group(id: string, label: string, icon: LucideIcon, children: (NavChild | false)[]): NavEntry | null {
  const visible = children.filter((child): child is NavChild => child !== false)
  if (visible.length === 0) return null
  if (visible.length === 1) return link(visible[0].to, visible[0].label, icon, { end: visible[0].end, count: visible[0].count })
  return { kind: 'group', id, label, icon, children: visible }
}

/** El menú lateral según el rol y, en el equipo de K'Plan, según sus permisos. */
export function navigationFor({ role, organization, can }: Session): NavEntry[] {
  const agenda = link(paths.home, 'Agenda', CalendarDays, { end: true })
  const events = link(paths.events, 'Eventos', CalendarHeart)
  const badges = link(paths.badges, 'Insignias', Medal)

  if (role === 'admin') {
    return [
      can('agenda.view') && agenda,
      group('organizaciones', 'Organizaciones', Building2, [
        can('organizations.review', 'organizations.manage') && { to: paths.admissions, label: 'Solicitudes', count: 'pendingAdmissions' },
        can('organizations.review', 'organizations.manage') && { to: paths.organizations, label: 'Todas' },
      ]),
      can('guides.review', 'guides.decide') && link(paths.guides, 'Guías y traductores', BadgeCheck, { count: 'pendingGuides' }),
      group('contenido', 'Contenido', Layers, [
        can('places.manage') && { to: paths.places, label: 'Lugares' },
        can('content.moderate') && { to: paths.coupons, label: 'Cupones' },
        can('content.moderate') && { to: paths.events, label: 'Eventos' },
        can('content.moderate') && { to: paths.badges, label: 'Insignias' },
      ]),
      group('usuarios', 'Usuarios', Users, [
        can('users.manage') && { to: paths.users, label: 'Todos los usuarios', end: true },
        can('staff.manage') && { to: paths.staff, label: 'Equipo interno' },
        can('staff.manage') && { to: paths.staffRoles, label: 'Roles y permisos' },
      ]),
      group('finanzas', 'Finanzas', Wallet, [
        can('billing.manage') && { to: paths.collections, label: 'Cobros' },
        can('billing.manage') && { to: paths.pricing, label: 'Tarifas' },
      ]),
    ].filter((entry): entry is NavEntry => !!entry)
  }

  const placeCount = organization?.stopIds.length ?? 0
  const places = link(paths.places, role === 'alcaldia' ? 'Lugares' : placeCount === 1 ? 'Mi lugar' : 'Mis lugares', MapPin)
  const billing = link(paths.billing, 'Pagos', Receipt)

  if (organization?.status === 'pending') {
    return [link(paths.application, 'Mi solicitud', FileCheck2), ...(placeCount > 0 ? [places] : [])]
  }

  if (role === 'alcaldia') return [agenda, places, events, badges, billing]
  return [agenda, places, link(paths.coupons, 'Cupones', TicketPercent), events, badges, billing]
}

/** A dónde entra cada quien: la agenda, o el primer módulo que su rol permite. */
export function landingPath(session: Session): string | null {
  const first = navigationFor(session)[0]
  if (!first) return null
  return first.kind === 'link' ? first.to : first.children[0].to
}
