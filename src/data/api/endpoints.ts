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
    /** Pública: los lugares de una ciudad que todavía no administra nadie. */
    available: '/api/stops/available',
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
  /** Organizaciones aprobadas que piden administrar otro lugar. */
  placeRequests: {
    list: '/api/place-requests',
    decision: (requestId: string) => `/api/place-requests/${id(requestId)}/decision`,
  },
  /** Sube un archivo y devuelve su URL; se usa antes de mandar una solicitud. */
  uploads: '/api/uploads',
  organizationApplications: {
    list: '/api/organization-applications',
    /** El equipo llena la solicitud por la organización. */
    assisted: '/api/organization-applications/assisted',
    reviewers: '/api/organization-applications/reviewers',
    /** La solicitud de quien entró: negocio o alcaldía en revisión. */
    mine: '/api/organization-applications/mine',
    detail: (applicationId: string) => `/api/organization-applications/${id(applicationId)}`,
    assign: (applicationId: string) => `/api/organization-applications/${id(applicationId)}/assign`,
    review: (applicationId: string, documentId: string) =>
      `/api/organization-applications/${id(applicationId)}/documents/${id(documentId)}/review`,
    /** Quien se postuló sube o reemplaza un documento. */
    documents: (applicationId: string) => `/api/organization-applications/${id(applicationId)}/documents`,
    resubmit: (applicationId: string) => `/api/organization-applications/${id(applicationId)}/resubmit`,
    advance: (applicationId: string) => `/api/organization-applications/${id(applicationId)}/advance`,
    requestChanges: (applicationId: string) => `/api/organization-applications/${id(applicationId)}/request-changes`,
    decision: (applicationId: string) => `/api/organization-applications/${id(applicationId)}/decision`,
  },
  users: {
    list: '/api/users',
    detail: (userId: string) => `/api/users/${id(userId)}`,
    passwordReset: (userId: string) => `/api/users/${id(userId)}/password-reset`,
    staffInvite: '/api/users/staff',
  },
  staffRoles: {
    list: '/api/staff-roles',
    detail: (roleId: string) => `/api/staff-roles/${id(roleId)}`,
  },
  guideApplications: {
    list: '/api/guide-applications',
    /** Quienes pueden revisar o decidir: para asignar solicitudes y leer nombres. */
    reviewers: '/api/guide-applications/reviewers',
    detail: (applicationId: string) => `/api/guide-applications/${id(applicationId)}`,
    assign: (applicationId: string) => `/api/guide-applications/${id(applicationId)}/assign`,
    document: (applicationId: string, documentId: string) =>
      `/api/guide-applications/${id(applicationId)}/documents/${id(documentId)}/review`,
    check: (applicationId: string, checkType: string) =>
      `/api/guide-applications/${id(applicationId)}/background/${id(checkType)}`,
    advance: (applicationId: string) => `/api/guide-applications/${id(applicationId)}/advance`,
    requestChanges: (applicationId: string) => `/api/guide-applications/${id(applicationId)}/request-changes`,
    decision: (applicationId: string) => `/api/guide-applications/${id(applicationId)}/decision`,
  },
  visitEvents: '/api/visit-events',
  /** Sólo existe en el modo demo. */
  demoReset: '/api/demo/reset',
} as const
