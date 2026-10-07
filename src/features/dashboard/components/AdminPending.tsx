import { ArrowRight, BadgeCheck, Building2, MapPin, Receipt } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '@/app/router/paths'
import { useStatements } from '@/data/hooks/use-billing'
import { useOpenProviderCount } from '@/data/hooks/use-providers'
import { usePlaceRequests } from '@/data/hooks/use-place-requests'
import { useOpenRequestCount } from '@/data/hooks/use-verification'
import { useSession } from '@/features/auth/use-auth'
import { formatMoney, plural } from '@/lib/format'

/** Lo que espera una decisión del equipo de K'Plan, según lo que su rol puede hacer. Si no hay nada, no se muestra. */
export function AdminPending() {
  const { can } = useSession()
  const pendingRequests = useOpenRequestCount(can('organizations.view'))
  const placeRequests = usePlaceRequests({ status: 'pending' }, can('organizations.view'))
  const guideCount = useOpenProviderCount(can('guides.view')) ?? 0
  const statements = useStatements(undefined, can('billing.view'))
  const due = (statements.data ?? []).filter((statement) => statement.status === 'due' && statement.total > 0)
  const dueTotal = due.reduce((sum, statement) => sum + statement.total, 0)

  const items = [
    guideCount > 0
      ? {
          to: paths.guides,
          icon: <BadgeCheck size={16} aria-hidden="true" />,
          text: `${plural(guideCount, 'solicitud de guía o traductor espera', 'solicitudes de guías y traductores esperan')} revisión`,
        }
      : null,
    pendingRequests !== undefined && pendingRequests > 0
      ? {
          to: paths.admissions,
          icon: <Building2 size={16} aria-hidden="true" />,
          text: `${plural(pendingRequests, 'solicitud de organización espera', 'solicitudes de organizaciones esperan')} revisión`,
        }
      : null,
    placeRequests.data && placeRequests.data.length > 0
      ? {
          to: `${paths.admissions}?vista=lugares`,
          icon: <MapPin size={16} aria-hidden="true" />,
          text: `${plural(placeRequests.data.length, 'organización pide', 'organizaciones piden')} otro lugar`,
        }
      : null,
    due.length > 0
      ? {
          to: paths.collections,
          icon: <Receipt size={16} aria-hidden="true" />,
          text: `${plural(due.length, 'estado de cuenta', 'estados de cuenta')} por cobrar: ${formatMoney(dueTotal)}`,
        }
      : null,
  ].filter((item) => item !== null)

  if (items.length === 0) return null

  return (
    <ul className="flex flex-wrap gap-2" aria-label="Pendientes">
      {items.map((item) => (
        <li key={item.to}>
          <Link
            to={item.to}
            className="group inline-flex items-center gap-2 rounded-kp border border-ink/15 bg-surface px-3.5 py-2 text-small font-medium text-ink transition-colors duration-150 hover:border-ink/40"
          >
            <span className="text-brand-strong">{item.icon}</span>
            {item.text}
            <ArrowRight size={14} aria-hidden="true" className="text-muted group-hover:text-ink" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
