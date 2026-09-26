import { ArrowRight, Building2, Receipt } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '@/app/router/paths'
import { useStatements } from '@/data/hooks/use-billing'
import { useOrganizations } from '@/data/hooks/use-organizations'
import { formatMoney, plural } from '@/lib/format'

/** Lo que espera una decisión del equipo de K'Plan. Si no hay nada, no se muestra. */
export function AdminPending() {
  const pending = useOrganizations({ status: 'pending' })
  const statements = useStatements()
  const due = (statements.data ?? []).filter((statement) => statement.status === 'due' && statement.total > 0)
  const dueTotal = due.reduce((sum, statement) => sum + statement.total, 0)
  const items = [
    pending.data && pending.data.length > 0
      ? {
          to: paths.organizations,
          icon: <Building2 size={16} aria-hidden="true" />,
          text: `${plural(pending.data.length, 'organización espera', 'organizaciones esperan')} tu aprobación`,
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
