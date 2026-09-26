import { ArrowRight, BadgeCheck, Building2, Receipt } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '@/app/router/paths'
import { useStatements } from '@/data/hooks/use-billing'
import { useGuideApplications } from '@/data/hooks/use-guides'
import { useAdmissions } from '@/data/hooks/use-admissions'
import { useSession } from '@/features/auth/use-auth'
import { formatMoney, plural } from '@/lib/format'

/** Lo que espera una decisión del equipo de K'Plan, según lo que su rol puede hacer. Si no hay nada, no se muestra. */
export function AdminPending() {
  const { can } = useSession()
  const pending = useAdmissions({ status: 'in_review' }, can('organizations.review', 'organizations.manage'))
  const guides = useGuideApplications({ status: 'in_review' }, can('guides.review', 'guides.decide'))
  const statements = useStatements(undefined, can('billing.manage'))
  const due = (statements.data ?? []).filter((statement) => statement.status === 'due' && statement.total > 0)
  const dueTotal = due.reduce((sum, statement) => sum + statement.total, 0)
  const toDecide = (guides.data ?? []).filter((application) => application.stage === 'decision').length
  const guideCount = can('guides.review') ? (guides.data?.length ?? 0) : toDecide

  const items = [
    guideCount > 0
      ? {
          to: can('guides.review') ? paths.guides : `${paths.guides}?etapa=decision`,
          icon: <BadgeCheck size={16} aria-hidden="true" />,
          text: can('guides.review')
            ? `${plural(guideCount, 'guía o traductor espera', 'guías y traductores esperan')} verificación`
            : `${plural(guideCount, 'solicitud espera', 'solicitudes esperan')} tu decisión`,
        }
      : null,
    pending.data && pending.data.length > 0
      ? {
          to: paths.admissions,
          icon: <Building2 size={16} aria-hidden="true" />,
          text: `${plural(pending.data.length, 'solicitud de organización espera', 'solicitudes de organizaciones esperan')} revisión`,
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
