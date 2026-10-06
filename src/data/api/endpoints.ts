/**
 * El contrato con la API: todas las rutas en un solo lugar. El backend de
 * demo (src/data/mock) implementa estas mismas rutas.
 *
 * - `auth`, `catalog`, `upload` y `organizationApplication` son rutas reales del API
 *   (docs/autenticacion.md y docs/organizaciones.md del repo del API): sin prefijo `/api` y
 *   con barra final. La sesión viaja en cookies `HttpOnly`.
 * - El resto (`/api/...`) es el checklist de lo que falta: el API todavía no publica esos
 *   recursos y cada sección se alinea con el API cuando su fase llega (F4 en adelante).
 *   `organizationApplications` (en plural) y `uploads` son del modelo de demo anterior a F3
 *   (revisión por documento, alta asistida) y solo existen en el modo demo.
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
  /** Sube un archivo y devuelve su URL; se usa antes de mandar una solicitud. */
  uploads: '/api/uploads',
  organizationApplications: {
    list: '/api/organization-applications',
    /** El equipo llena la solicitud por la organización. */
    assisted: '/api/organization-applications/assisted',
    reviewers: '/api/organization-applications/reviewers',
    detail: (applicationId: string) => `/api/organization-applications/${id(applicationId)}`,
    assign: (applicationId: string) => `/api/organization-applications/${id(applicationId)}/assign`,
    review: (applicationId: string, documentId: string) =>
      `/api/organization-applications/${id(applicationId)}/documents/${id(documentId)}/review`,
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
  /** Sólo existe en el modo demo: hace de equipo y resuelve la solicitud de quien entró. */
  demoDecision: '/api/demo/application-decision',
  /** Sólo existe en el modo demo: el "almacenamiento" que recibe los archivos firmados. */
  demoBucket: '/api/demo/bucket',
} as const
