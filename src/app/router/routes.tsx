import { createBrowserRouter } from 'react-router'
import { AppShell } from '../layout/AppShell'
import { NotFoundPage } from '../pages/NotFoundPage'
import { RouteErrorPage } from '../pages/RouteErrorPage'
import { RedirectIfAuthenticated, RequireAuth, RequireRole, SessionLoader } from './guards'
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
            index: true,
            lazy: async () => ({ Component: (await import('@/features/dashboard/DashboardPage')).DashboardPage }),
          },
          {
            path: 'lugares',
            children: [
              { index: true, lazy: async () => ({ Component: (await import('@/features/places/PlacesPage')).PlacesPage }) },
              {
                path: ':stopId',
                lazy: async () => ({ Component: (await import('@/features/places/PlaceEditorPage')).PlaceEditorPage }),
              },
            ],
          },
          {
            path: 'eventos',
            lazy: async () => ({ Component: (await import('@/features/events/EventsPage')).EventsPage }),
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
          {
            path: 'insignias',
            lazy: async () => ({ Component: (await import('@/features/badges/BadgesPage')).BadgesPage }),
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
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
