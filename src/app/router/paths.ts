/** Todas las rutas del portal en un solo lugar. */
export const paths = {
  login: '/entrar',
  home: '/',
  places: '/lugares',
  place: (stopId: string) => `/lugares/${encodeURIComponent(stopId)}`,
  coupons: '/cupones',
  events: '/eventos',
  badges: '/insignias',
  billing: '/pagos',
  organizations: '/organizaciones',
  organization: (organizationId: string) => `/organizaciones/${encodeURIComponent(organizationId)}`,
  collections: '/cobros',
  pricing: '/tarifas',
} as const
