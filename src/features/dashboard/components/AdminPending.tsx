import { ArrowRight, BadgeCheck, Building2, CircleAlert, CreditCard, Landmark, MapPin, MessageSquareText, Receipt, RotateCw } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '@/app/router/paths'
import { usePayments, useStatements, useWithdrawals } from '@/data/hooks/use-billing'
import { useDemoRequests } from '@/data/hooks/use-landing'
import { useProviderQueue } from '@/data/hooks/use-providers'
import { usePlaceRequests } from '@/data/hooks/use-place-requests'
import { useVerificationQueue } from '@/data/hooks/use-verification'
import { useSession } from '@/features/auth/use-auth'
import { plural } from '@/lib/format'

/**
 * Lo que espera una decisión del equipo de K'Plan, según lo que su rol puede hacer. Si no hay nada,
 * no se muestra; si algo no se pudo revisar, lo dice con un reintento en vez de callarlo.
 */
export function AdminPending() {
  const { can } = useSession()
  // Sólo hace falta cuántos hay: una página de uno trae `elements` (las mismas consultas que el menú).
  const requests = useVerificationQueue({ status: 'open', page: 1, pageSize: 1 }, can('organizations.view'))
  const placeRequests = usePlaceRequests({ status: 'pending' }, can('organizations.view'))
  const guides = useProviderQueue({ status: 'open', page: 1, pageSize: 1 }, can('guides.view'))
  const statements = useStatements({ status: 'pending', pageSize: 1 }, can('billing.view'))
  const payments = usePayments({ status: 'pending', pageSize: 1 }, can('billing.manage'))
  const withdrawals = useWithdrawals({ status: 'pending', pageSize: 1 }, can('billing.manage'))
  const demos = useDemoRequests({ status: 'pending', page: 1, pageSize: 1 }, can('demos.view'))
  const pendingRequests = requests.data?.elements
  const guideCount = guides.data?.elements ?? 0
  const dueStatements = statements.data?.elements ?? 0
  const pendingPayments = payments.data?.elements ?? 0
  const pendingWithdrawals = withdrawals.data?.elements ?? 0
  const pendingDemos = demos.data?.elements ?? 0
  const failed = [requests, placeRequests, guides, statements, payments, withdrawals, demos].filter((query) => query.isError)

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
    pendingPayments > 0
      ? {
          to: paths.collections,
          icon: <CreditCard size={16} aria-hidden="true" />,
          text: `${plural(pendingPayments, 'pago de reserva', 'pagos de reservas')} por confirmar`,
        }
      : null,
    pendingWithdrawals > 0
      ? {
          to: paths.withdrawals,
          icon: <Landmark size={16} aria-hidden="true" />,
          text: `${plural(pendingWithdrawals, 'retiro de guía', 'retiros de guías')} por pagar`,
        }
      : null,
    dueStatements > 0
      ? {
          to: `${paths.collections}?vista=comercios`,
          icon: <Receipt size={16} aria-hidden="true" />,
          text: `${plural(dueStatements, 'estado de cuenta', 'estados de cuenta')} por cobrar`,
        }
      : null,
    pendingDemos > 0
      ? {
          to: paths.demoRequests,
          icon: <MessageSquareText size={16} aria-hidden="true" />,
          text: `${plural(pendingDemos, 'solicitud de demo espera', 'solicitudes de demo esperan')} el link de la app`,
        }
      : null,
  ].filter((item) => item !== null)

  if (items.length === 0 && failed.length === 0) return null

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
      {failed.length > 0 && (
        <li>
          <button
            type="button"
            onClick={() => failed.forEach((query) => void query.refetch())}
            className="group inline-flex items-center gap-2 rounded-kp border border-danger/30 bg-surface px-3.5 py-2 text-small font-medium text-ink transition-colors duration-150 hover:border-danger/60"
          >
            <CircleAlert size={16} aria-hidden="true" className="text-danger" />
            No pudimos revisar todos los pendientes
            <span className="inline-flex items-center gap-1 text-brand-strong">
              <RotateCw size={14} aria-hidden="true" />
              Reintentar
            </span>
          </button>
        </li>
      )}
    </ul>
  )
}
