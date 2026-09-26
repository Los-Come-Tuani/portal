import {
  Building2,
  CalendarDays,
  CalendarHeart,
  MapPin,
  Medal,
  Receipt,
  SlidersHorizontal,
  TicketPercent,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { Session } from '@/features/auth/use-auth'
import { paths } from '../router/paths'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

/** El menú lateral según el rol. */
export function navigationFor({ role, organization }: Session): NavItem[] {
  const agenda: NavItem = { to: paths.home, label: 'Agenda', icon: CalendarDays, end: true }
  const events: NavItem = { to: paths.events, label: 'Eventos', icon: CalendarHeart }
  const badges: NavItem = { to: paths.badges, label: 'Insignias', icon: Medal }

  if (role === 'admin') {
    return [
      agenda,
      { to: paths.organizations, label: 'Organizaciones', icon: Building2 },
      { to: paths.places, label: 'Lugares', icon: MapPin },
      { to: paths.coupons, label: 'Cupones', icon: TicketPercent },
      events,
      badges,
      { to: paths.collections, label: 'Cobros', icon: Wallet },
      { to: paths.pricing, label: 'Tarifas', icon: SlidersHorizontal },
    ]
  }

  const placeCount = organization?.stopIds.length ?? 0
  const places: NavItem = {
    to: paths.places,
    label: role === 'alcaldia' ? 'Lugares' : placeCount === 1 ? 'Mi lugar' : 'Mis lugares',
    icon: MapPin,
  }
  const billing: NavItem = { to: paths.billing, label: 'Pagos', icon: Receipt }

  if (role === 'alcaldia') return [agenda, places, events, badges, billing]
  return [agenda, places, { to: paths.coupons, label: 'Cupones', icon: TicketPercent }, events, badges, billing]
}
