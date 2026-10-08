/**
 * El contrato con la API: todas las rutas en un solo lugar. El backend de
 * demo (src/data/mock) implementa estas mismas rutas.
 *
 * - Las rutas sin prefijo `/api` y con barra final son del API real (docs/autenticacion.md,
 *   docs/roles.md, docs/organizaciones.md, docs/prestadores.md y docs/territorio.md del repo del
 *   API). La sesión viaja en cookies `HttpOnly`.
 * - El resto (`/api/...`) es el checklist de lo que falta: el API todavía no publica esos
 *   recursos y cada sección se alinea con el API cuando su fase llega (organizaciones y pedidos de
 *   lugar, eventos, cupones, insignias, cobros y la actividad de la agenda).
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
    /** Le manda a una persona un código para crear otra contraseña. */
    userPasswordReset: '/auth/user-password-reset/',
    /** El directorio de cuentas ("Todos los usuarios"), paginado. */
    accounts: '/auth/account/',
    /** Una cuenta del directorio: `GET` y `PATCH` (solo el nombre). */
    account: (userId: string) => `/auth/account/${id(userId)}/`,
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
    /** Los pilares culturales: la categoría de un lugar. */
    pillars: '/catalog/pillar/',
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
  /** La lista de organizaciones del portal: el API todavía no la publica. */
  organizations: {
    list: '/api/organizations',
    detail: (organizationId: string) => `/api/organizations/${id(organizationId)}`,
  },
  /**
   * Los lugares del portal (F4, docs/territorio.md): el equipo con `places.view` los ve todos y una
   * organización verificada, los suyos.
   */
  place: {
    list: '/place/',
    detail: (placeId: string) => `/place/${id(placeId)}/`,
    /** `PUT { kind, id }` le da dueño; `{}` lo devuelve al equipo. */
    owner: (placeId: string) => `/place/${id(placeId)}/owner/`,
    profile: (placeId: string) => `/place/${id(placeId)}/profile/`,
  },
  /** Las novedades de un lugar (`place_id` filtra). */
  post: {
    list: '/post/',
    detail: (postId: string) => `/post/${id(postId)}/`,
  },
  /** Los lugares activos como los ve la app, sin sesión: el editor de circuitos elige de aquí sus paradas. */
  stops: {
    list: '/stop/',
    detail: (stopId: string) => `/stop/${id(stopId)}/`,
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
  /** Organizaciones aprobadas que piden administrar otro lugar: el API todavía no lo tiene. */
  placeRequests: {
    list: '/api/place-requests',
    decision: (requestId: string) => `/api/place-requests/${id(requestId)}/decision`,
    /** Los lugares de una ciudad que todavía no administra ni pidió nadie. */
    availableStops: '/api/stops/available',
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
