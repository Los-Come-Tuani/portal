import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigation } from 'react-router'
import { ValidateCouponProvider } from '@/features/coupons/ValidateCouponProvider'
import { cn } from '@/lib/cn'
import { SidebarContent } from './Sidebar'
import { Topbar } from './Topbar'
import { useSidebarPreferences } from './use-sidebar-preferences'

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false)
  const sidebar = useSidebarPreferences()
  const drawerRef = useRef<HTMLDialogElement>(null)
  const navigation = useNavigation()
  const location = useLocation()

  useEffect(() => {
    const drawer = drawerRef.current
    if (!drawer) return
    if (navOpen && !drawer.open) drawer.showModal()
    if (!navOpen && drawer.open) drawer.close()
  }, [navOpen])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <ValidateCouponProvider>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-kp focus:bg-ink focus:px-4 focus:py-2 focus:text-canvas"
      >
        Saltar al contenido
      </a>

      <div className="kplan-shell min-h-dvh lg:grid lg:grid-cols-[auto_minmax(0,1fr)]">
        <aside
          className={cn(
            'hidden border-r border-divider bg-surface transition-[width] duration-200 ease-out-expo lg:sticky lg:top-0 lg:z-20 lg:block lg:h-dvh',
            sidebar.collapsed ? 'lg:w-18' : 'lg:w-66',
          )}
        >
          <SidebarContent preferences={sidebar} collapsible />
        </aside>

        <dialog
          ref={drawerRef}
          aria-label="Menú"
          onCancel={(event) => {
            event.preventDefault()
            setNavOpen(false)
          }}
          onClick={(event) => {
            if (event.target === drawerRef.current) setNavOpen(false)
          }}
          className="my-0 mr-auto ml-0 h-dvh max-h-none w-[min(17rem,85vw)] bg-surface p-0 backdrop:bg-ink/45 open:animate-fade lg:hidden"
        >
          {navOpen && <SidebarContent preferences={sidebar} onNavigate={() => setNavOpen(false)} />}
        </dialog>

        <div className="flex min-w-0 flex-col">
          <Topbar onOpenNav={() => setNavOpen(true)} />
          <div
            aria-hidden="true"
            className={cn(
              'h-0.5 origin-left bg-brand transition-[transform,opacity] duration-300 ease-out',
              navigation.state === 'loading' ? 'scale-x-75 opacity-100' : 'scale-x-0 opacity-0',
            )}
          />
          <main id="contenido" className="mx-auto w-full min-w-0 max-w-[100rem] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </ValidateCouponProvider>
  )
}
