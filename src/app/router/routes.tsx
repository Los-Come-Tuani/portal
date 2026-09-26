import { createBrowserRouter } from 'react-router'
import { AppShell } from '../layout/AppShell'
import { NotFoundPage } from '../pages/NotFoundPage'
import { RouteErrorPage } from '../pages/RouteErrorPage'
import { RedirectIfAuthenticated, RequireAgenda, RequireAuth, RequirePermission, RequireRole, SessionLoader } from './guards'
import { paths } from './paths'

/** Cada módulo se descarga cuando se visita por primera vez. */
export const router = createBrowserRouter([
  {
    element: <RedirectIfAuthenticated />,
    HydrateFallback: SessionLoader,
    children: [
      { path: paths.login, lazy: async () => ({ Component: (await import('@/features/auth/LoginPage')).LoginPage }) },
    ],
  },
  {
    element: <RequireAuth />,
    errorElement: <RouteErrorPage />,
    HydrateFallback: SessionLoader,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            element: <RequireAgenda />,
            children: [
              {
                index: true,
                lazy: async () => ({ Component: (await import('@/features/dashboard/DashboardPage')).DashboardPage }),
              },
            ],
          },
          {
            path: 'lugares',
            element: <RequirePermission anyOf={['places.manage']} />,
            children: [
              { index: true, lazy: async () => ({ Component: (await import('@/features/places/PlacesPage')).PlacesPage }) },
              {
                path: ':stopId',
                lazy: async () => ({ Component: (await import('@/features/places/PlaceEditorPage')).PlaceEditorPage }),
              },
            ],
          },
          {
            element: <RequirePermission anyOf={['content.moderate']} />,
            children: [
              {
                path: 'eventos',
                lazy: async () => ({ Component: (await import('@/features/events/EventsPage')).EventsPage }),
              },
              {
                path: 'insignias',
                lazy: async () => ({ Component: (await import('@/features/badges/BadgesPage')).BadgesPage }),
              },
              {
                element: <RequireRole roles={['negocio', 'admin']} />,
                children: [
                  {
                    path: 'cupones',
                    lazy: async () => ({ Component: (await import('@/features/coupons/CouponsPage')).CouponsPage }),
                  },
                ],
              },
            ],
          },
          {
            element: <RequireRole roles={['negocio', 'alcaldia']} />,
            children: [
              {
                path: 'pagos',
                lazy: async () => ({ Component: (await import('@/features/billing/BillingPage')).BillingPage }),
              },
            ],
          },
          {
            element: <RequireRole roles={['admin']} />,
            children: [
              {
                element: <RequirePermission anyOf={['organizations.review', 'organizations.manage']} />,
                children: [
                  {
                    path: 'organizaciones',
                    lazy: async () => ({
                      Component: (await import('@/features/admin/organizations/OrganizationsPage')).OrganizationsPage,
                    }),
                  },
                  {
                    path: 'organizaciones/:organizationId',
                    lazy: async () => ({
                      Component: (await import('@/features/admin/organizations/OrganizationDetailPage')).OrganizationDetailPage,
                    }),
                  },
                ],
              },
              {
                element: <RequirePermission anyOf={['guides.review', 'guides.decide']} />,
                children: [
                  {
                    path: 'guias',
                    lazy: async () => ({
                      Component: (await import('@/features/admin/guides/GuideApplicationsPage')).GuideApplicationsPage,
                    }),
                  },
                  {
                    path: 'guias/:applicationId',
                    lazy: async () => ({
                      Component: (await import('@/features/admin/guides/GuideApplicationPage')).GuideApplicationPage,
                    }),
                  },
                ],
              },
              {
                element: <RequirePermission anyOf={['users.manage']} />,
                children: [
                  {
                    path: 'usuarios',
                    lazy: async () => ({ Component: (await import('@/features/admin/users/UsersPage')).UsersPage }),
                  },
                ],
              },
              {
                element: <RequirePermission anyOf={['staff.manage']} />,
                children: [
                  {
                    path: 'usuarios/equipo',
                    lazy: async () => ({ Component: (await import('@/features/admin/staff/StaffPage')).StaffPage }),
                  },
                  {
                    path: 'usuarios/roles',
                    lazy: async () => ({ Component: (await import('@/features/admin/staff/RolesPage')).RolesPage }),
                  },
                ],
              },
              {
                element: <RequirePermission anyOf={['billing.manage']} />,
                children: [
                  {
                    path: 'cobros',
                    lazy: async () => ({
                      Component: (await import('@/features/admin/collections/CollectionsPage')).CollectionsPage,
                    }),
                  },
                  {
                    path: 'tarifas',
                    lazy: async () => ({ Component: (await import('@/features/admin/pricing/PricingPage')).PricingPage }),
                  },
                ],
              },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
