import { createBrowserRouter } from 'react-router'
import { AppShell } from '../layout/AppShell'
import { NotFoundPage } from '../pages/NotFoundPage'
import { RouteErrorPage } from '../pages/RouteErrorPage'
import {
  RedirectIfAuthenticated,
  RequireActiveOrganization,
  RequireAgenda,
  RequireAuth,
  RequirePermission,
  RequireRole,
  SessionLoader,
} from './guards'
import { paths } from './paths'

/**
 * Cada módulo se descarga cuando se visita por primera vez. La raíz atrapa lo que falle en
 * cualquier rama, también en las públicas (entrada, postulación, invitación).
 */
export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    HydrateFallback: SessionLoader,
    children: [
      {
        element: <RedirectIfAuthenticated />,
        HydrateFallback: SessionLoader,
        children: [
          { path: paths.login, lazy: async () => ({ Component: (await import('@/features/auth/LoginPage')).LoginPage }) },
          {
            path: paths.resetPassword,
            lazy: async () => ({ Component: (await import('@/features/auth/ResetPasswordPage')).ResetPasswordPage }),
          },
          {
            path: paths.invitation,
            lazy: async () => ({ Component: (await import('@/features/auth/AcceptInvitationPage')).AcceptInvitationPage }),
          },
          { path: paths.apply, lazy: async () => ({ Component: (await import('@/features/onboarding/ApplyPage')).ApplyPage }) },
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
              // La seguridad de la cuenta es de todos los roles, también de una organización en revisión.
              {
                path: 'seguridad',
                lazy: async () => ({ Component: (await import('@/features/security/SecurityPage')).SecurityPage }),
              },
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
                element: <RequirePermission anyOf={['places.view']} />,
                children: [
                  { index: true, lazy: async () => ({ Component: (await import('@/features/places/PlacesPage')).PlacesPage }) },
                  {
                    path: ':stopId',
                    lazy: async () => ({ Component: (await import('@/features/places/PlaceEditorPage')).PlaceEditorPage }),
                  },
                ],
              },
              {
                element: <RequireRole roles={['negocio', 'alcaldia']} />,
                children: [
                  {
                    path: 'solicitud',
                    lazy: async () => ({
                      Component: (await import('@/features/onboarding/ApplicationStatusPage')).ApplicationStatusPage,
                    }),
                  },
                  {
                    path: 'solicitud/corregir',
                    lazy: async () => ({
                      Component: (await import('@/features/onboarding/CorrectApplicationPage')).CorrectApplicationPage,
                    }),
                  },
                ],
              },
              {
                element: <RequireActiveOrganization />,
                children: [
                  {
                    element: <RequirePermission anyOf={['content.moderate']} />,
                    children: [
                      {
                        element: <RequireRole roles={['admin', 'alcaldia']} />,
                        children: [
                          {
                            path: 'eventos',
                            lazy: async () => ({ Component: (await import('@/features/events/EventsPage')).EventsPage }),
                          },
                        ],
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
                    element: <RequirePermission anyOf={['places.view']} />,
                    children: [
                      {
                        path: 'insignias',
                        lazy: async () => ({ Component: (await import('@/features/badges/BadgesPage')).BadgesPage }),
                      },
                    ],
                  },
                  {
                    // Los estados de cuenta son de los comercios: la alcaldía no tiene.
                    element: <RequireRole roles={['negocio']} />,
                    children: [
                      {
                        path: 'pagos',
                        lazy: async () => ({ Component: (await import('@/features/billing/BillingPage')).BillingPage }),
                      },
                    ],
                  },
                ],
              },
              {
                element: <RequireRole roles={['admin', 'alcaldia']} />,
                children: [
                  {
                    element: <RequireActiveOrganization />,
                    children: [
                      {
                        element: <RequirePermission anyOf={['circuits.view']} />,
                        children: [
                          {
                            path: 'circuitos',
                            lazy: async () => ({ Component: (await import('@/features/circuits/CircuitsPage')).CircuitsPage }),
                          },
                          {
                            path: 'circuitos/:circuitId',
                            lazy: async () => ({ Component: (await import('@/features/circuits/CircuitEditorPage')).CircuitEditorPage }),
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                element: <RequireRole roles={['admin']} />,
                children: [
                  {
                    element: <RequirePermission anyOf={['organizations.view']} />,
                    children: [
                      {
                        path: 'solicitudes',
                        lazy: async () => ({ Component: (await import('@/features/admin/admissions/AdmissionsPage')).AdmissionsPage }),
                      },
                      {
                        path: 'solicitudes/:applicationId',
                        lazy: async () => ({ Component: (await import('@/features/admin/admissions/AdmissionPage')).AdmissionPage }),
                      },
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
                    element: <RequirePermission anyOf={['guides.view']} />,
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
                    element: <RequirePermission anyOf={['content.moderate']} />,
                    children: [
                      {
                        path: 'resenas',
                        lazy: async () => ({ Component: (await import('@/features/admin/reviews/ReviewDisputesPage')).ReviewDisputesPage }),
                      },
                    ],
                  },
                  {
                    element: <RequirePermission anyOf={['content.moderate', 'users.manage']} />,
                    children: [
                      {
                        path: 'reportes',
                        lazy: async () => ({ Component: (await import('@/features/admin/moderation/ReportsPage')).ReportsPage }),
                      },
                    ],
                  },
                  {
                    element: <RequirePermission anyOf={['users.view']} />,
                    children: [
                      {
                        path: 'usuarios',
                        lazy: async () => ({ Component: (await import('@/features/admin/users/UsersPage')).UsersPage }),
                      },
                      {
                        path: 'sanciones',
                        lazy: async () => ({ Component: (await import('@/features/admin/moderation/SanctionsPage')).SanctionsPage }),
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
                    element: <RequirePermission anyOf={['billing.view']} />,
                    children: [
                      {
                        path: 'cobros',
                        lazy: async () => ({
                          Component: (await import('@/features/admin/collections/CollectionsPage')).CollectionsPage,
                        }),
                      },
                      {
                        path: 'retiros',
                        lazy: async () => ({ Component: (await import('@/features/admin/finance/WithdrawalsPage')).WithdrawalsPage }),
                      },
                      {
                        path: 'tarifas',
                        lazy: async () => ({ Component: (await import('@/features/admin/pricing/PricingPage')).PricingPage }),
                      },
                    ],
                  },
                  {
                    element: <RequirePermission anyOf={['demos.view']} />,
                    children: [
                      {
                        path: 'demos',
                        lazy: async () => ({ Component: (await import('@/features/admin/landing/DemoRequestsPage')).DemoRequestsPage }),
                      },
                    ],
                  },
                  {
                    element: <RequirePermission anyOf={['releases.view']} />,
                    children: [
                      {
                        path: 'versiones',
                        lazy: async () => ({ Component: (await import('@/features/admin/landing/ReleasesPage')).ReleasesPage }),
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
    ],
  },
])
