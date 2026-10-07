/**
 * El contrato con la API: todas las rutas en un solo lugar. El backend de
 * demo (src/data/mock) implementa estas mismas rutas.
 *
 * - `auth`, `catalog`, `upload`, `organizationApplication` y `verificationRequest` son rutas
 *   reales del API (docs/autenticacion.md y docs/organizaciones.md del repo del API): sin
 *   prefijo `/api` y con barra final. La sesión viaja en cookies `HttpOnly`.
 * - El resto (`/api/...`) es el checklist de lo que falta: el API todavía no publica esos
 *   recursos y cada sección se alinea con el API cuando su fase llega (F4 en adelante).
 */
const id = (value: string) => encodeURIComponent(value)

export const endpoints = {
  auth: {
    /** `GET`: devuelve el token CSRF en la cabecera `x-csrftoken`. */
    csrf: '/auth/csrf/',
    login: '/auth/web/login/',
    /** Segundo paso del inicio de sesión cuando la cuenta tiene 2FA. */
    twoFactor: '/auth/web/two-factor/',
    refresh: '/auth/web/refresh/',
    logout: '/auth/web/logout/',
    /** La persona de la sesión. */
    profile: '/auth/profile/',
    passwordForgot: '/auth/password-forgot/',
    passwordReset: '/auth/password-reset/',
    passwordChange: '/auth/password-change/',
    /** Una persona invitada al equipo activa su cuenta con el código del correo. */
    staffAccept: '/auth/staff-accept/',
    /** Los roles del equipo: `GET` y `POST`. */
    staffRoles: '/auth/staff-role/',
    /** Un rol del equipo: `GET`, `PUT` y `DELETE`. */
    staffRole: (roleId: string) => `/auth/staff-role/${id(roleId)}/`,
    /** Las personas del equipo con su rol. */
    staffMembers: '/auth/staff-member/',
    /** Invita a alguien al equipo, o le vuelve a escribir si no ha aceptado. */
    staffInvite: '/auth/staff-invite/',
    /** Cambia el rol del equipo de una persona. */
    userRole: '/auth/user-role/',
    /** Suspende o reactiva una cuenta. */
    userStatus: '/auth/user-status/',
    /** Manda un código de seis dígitos al correo: quien se postula verifica así que es suyo. */
    registerCode: '/auth/register-code/',
    /** Comprueba el código sin gastarlo, para avanzar en el formulario. */
    registerVerify: '/auth/register-verify/',
    /** Cierra la sesión en todos los dispositivos. */
    sessionRevoke: '/auth/session-revoke/',
    /** `GET`: estado del 2FA de quien está dentro. */
    twoFactorStatus: '/auth/two-factor/',
    twoFactorSetup: '/auth/two-factor-setup/',
    twoFactorConfirm: '/auth/two-factor-confirm/',
    twoFactorRecovery: '/auth/two-factor-recovery/',
    twoFactorDisable: '/auth/two-factor-disable/',
  },
  /** Las listas de los formularios de alta: públicas. */
  catalog: {
    cities: '/catalog/city/',
    businessTypes: '/catalog/business-type/',
    institutionTypes: '/catalog/institution-type/',
  },
  /** `POST`: pide una URL firmada para subir un archivo directo al almacenamiento. */
  upload: '/upload/',
  /** Alta y estado de la solicitud de una organización (F3). */
  organizationApplication: {
    business: '/organization-application/business/',
    institution: '/organization-application/institution/',
    municipality: '/organization-application/municipality/',
    /** La solicitud más reciente de quien entró, con lo que mandó. */
    mine: '/organization-application/mine/',
    /** Corregir lo rechazado y volver a enviarlo. */
    resubmit: '/organization-application/mine/resubmit/',
  },
  /** La cola de verificación del equipo (F3): una bandeja para las tres clases de organización. */
  verificationRequest: {
    list: '/verification-request/',
    /** Los motivos que se ofrecen al rechazar. */
    reasons: '/verification-request/reason/',
    detail: (requestId: string) => `/verification-request/${id(requestId)}/`,
    take: (requestId: string) => `/verification-request/${id(requestId)}/take/`,
    release: (requestId: string) => `/verification-request/${id(requestId)}/release/`,
    approve: (requestId: string) => `/verification-request/${id(requestId)}/approve/`,
    reject: (requestId: string) => `/verification-request/${id(requestId)}/reject/`,
  },
  organizations: {
    list: '/api/organizations',
    detail: (organizationId: string) => `/api/organizations/${id(organizationId)}`,
    /** POST agrega lugares sin dueño; no se reemplaza la lista entera. */
    stops: (organizationId: string) => `/api/organizations/${id(organizationId)}/stops`,
    stop: (organizationId: string, stopId: string) => `/api/organizations/${id(organizationId)}/stops/${id(stopId)}`,
  },
  stops: {
    list: '/api/stops',
    /** Pública: los lugares de una ciudad que todavía no administra ni pidió nadie. */
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
    detail: (circuitId: string) => `/api/circuits/${id(circuitId)}`,
    /** Los horarios de grupo de un circuito creativo o especial; los publican los guías. */
    groupSessions: (circuitId: string) => `/api/circuits/${id(circuitId)}/group-sessions`,
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
  /** Todas las cuentas (pantalla "Todos los usuarios"): el API todavía no tiene este directorio. */
  users: {
    list: '/api/users',
    detail: (userId: string) => `/api/users/${id(userId)}`,
    passwordReset: (userId: string) => `/api/users/${id(userId)}/password-reset`,
  },
  /**
   * La cola de guías y traductores (F5): quien revisa acepta o rechaza cada documento y pide
   * correcciones; quien decide aprueba o rechaza al final.
   */
  providerRequest: {
    list: '/provider-request/',
    /** Los motivos para rechazar un documento y para rechazar al prestador. */
    reasons: '/provider-request/reason/',
    detail: (requestId: string) => `/provider-request/${id(requestId)}/`,
    take: (requestId: string) => `/provider-request/${id(requestId)}/take/`,
    release: (requestId: string) => `/provider-request/${id(requestId)}/release/`,
    documentReview: (requestId: string) => `/provider-request/${id(requestId)}/document-review/`,
    requestChanges: (requestId: string) => `/provider-request/${id(requestId)}/request-changes/`,
    approve: (requestId: string) => `/provider-request/${id(requestId)}/approve/`,
    reject: (requestId: string) => `/provider-request/${id(requestId)}/reject/`,
  },
  visitEvents: '/api/visit-events',
  /** Sólo existe en el modo demo. */
  demoReset: '/api/demo/reset',
  /** Sólo existe en el modo demo: hace de equipo y resuelve la solicitud de quien entró. */
  demoDecision: '/api/demo/application-decision',
  /** Sólo existe en el modo demo: el "almacenamiento" que recibe los archivos firmados. */
  demoBucket: '/api/demo/bucket',
} as const
