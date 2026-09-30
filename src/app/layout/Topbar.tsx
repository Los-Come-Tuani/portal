import { Menu as MenuIcon, ScanLine } from 'lucide-react'
import { Link } from 'react-router'
import { Isologo } from '@/components/brand/Logo'
import { Button, IconButton, Tag } from '@/components/ui'
import { ORGANIZATION_STATUS_LABELS, ORGANIZATION_TYPE_LABELS } from '@/data/models'
import { ORGANIZATION_STATUS_TONES } from '@/features/admin/organizations/status'
import { useSession } from '@/features/auth/use-auth'
import { useValidateCoupon } from '@/features/coupons/validate-coupon-context'
import { paths } from '../router/paths'
import { DemoMenu } from './DemoMenu'

export function Topbar({ onOpenNav }: { onOpenNav: () => void }) {
  const { organization, role, user } = useSession()
  const validateCoupon = useValidateCoupon()

  return (
    <header className="sticky top-0 z-30 flex min-h-18 items-center gap-1 border-b border-divider bg-surface px-3 sm:gap-3 sm:px-6 lg:px-8">
      <IconButton label="Abrir menú" icon={<MenuIcon size={20} />} onClick={onOpenNav} className="-ml-2 lg:hidden" />
      <Link to={paths.home} className="kplan-topbar-brand flex min-h-11 min-w-11 shrink-0 items-center lg:hidden" aria-label="K'Plan, ir al inicio">
        <Isologo className="h-8 text-ink" />
      </Link>

      <div className="hidden min-w-0 items-center gap-3 sm:flex">
        {organization ? (
          <>
            <p className="truncate text-body font-semibold text-ink">{organization.name}</p>
            <span className="hidden text-small text-muted md:inline">
              {ORGANIZATION_TYPE_LABELS[organization.type]} · {organization.city}
            </span>
            {organization.status !== 'active' && (
              <Tag tone={ORGANIZATION_STATUS_TONES[organization.status]}>
                {ORGANIZATION_STATUS_LABELS[organization.status]}
              </Tag>
            )}
          </>
        ) : (
          <>
            <p className="text-body font-semibold text-ink">Equipo K'Plan</p>
            {user.staffRoleName && <span className="hidden text-small text-muted md:inline">{user.staffRoleName}</span>}
          </>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <DemoMenu />
        {role === 'negocio' && organization?.status === 'active' && (
          <Button icon={<ScanLine size={16} />} onClick={() => validateCoupon.open()}>
            <span className="hidden sm:inline">Validar cupón</span>
            <span className="sm:hidden">Validar</span>
          </Button>
        )}
      </div>
    </header>
  )
}
