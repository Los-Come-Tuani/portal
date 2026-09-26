/**
 * El contrato con la API: todas las rutas en un solo lugar. El backend de
 * demo (src/data/mock) implementa exactamente estas mismas rutas, así que
 * conectar la API real es sólo configurar VITE_API_URL.
 */
const id = (value: string) => encodeURIComponent(value)

export const endpoints = {
  auth: {
    login: '/api/auth/login',
    me: '/api/auth/me',
    forgotPassword: '/api/auth/forgot-password',
  },
  organizations: {
    list: '/api/organizations',
    detail: (organizationId: string) => `/api/organizations/${id(organizationId)}`,
  },
  stops: {
    list: '/api/stops',
    detail: (stopId: string) => `/api/stops/${id(stopId)}`,
    profile: (stopId: string) => `/api/stops/${id(stopId)}/profile`,
  },
  posts: {
    list: '/api/posts',
    detail: (postId: string) => `/api/posts/${id(postId)}`,
  },
  circuits: {
    list: '/api/circuits',
  },
  events: {
    list: '/api/events',
    detail: (eventId: string) => `/api/events/${id(eventId)}`,
    moderation: (eventId: string) => `/api/events/${id(eventId)}/moderation`,
  },
  coupons: {
    list: '/api/coupons',
    detail: (couponId: string) => `/api/coupons/${id(couponId)}`,
  },
  redemptions: {
    list: '/api/coupon-redemptions',
    byCode: (code: string) => `/api/coupon-redemptions/${id(code)}`,
    validate: (code: string) => `/api/coupon-redemptions/${id(code)}/validate`,
  },
  badges: {
    activations: '/api/badge-activations',
    cancelActivation: (activationId: string) => `/api/badge-activations/${id(activationId)}/cancel`,
    campaigns: '/api/badge-campaigns',
    cancelCampaign: (campaignId: string) => `/api/badge-campaigns/${id(campaignId)}/cancel`,
  },
  billing: {
    statements: '/api/billing/statements',
    pay: (statementId: string) => `/api/billing/statements/${id(statementId)}/pay`,
  },
  pricing: '/api/pricing',
  visitEvents: '/api/visit-events',
  /** Sólo existe en el modo demo. */
  demoReset: '/api/demo/reset',
} as const
