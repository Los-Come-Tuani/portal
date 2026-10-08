/**
 * El contrato con la API: todas las rutas en un solo lugar. El backend de
 * demo (src/data/mock) implementa estas mismas rutas.
 *
 * - Las rutas sin prefijo `/api` y con barra final son del API real (docs/autenticacion.md,
 *   docs/roles.md, docs/organizaciones.md, docs/prestadores.md, docs/territorio.md y
 *   docs/servicios.md del repo del API). La sesión viaja en cookies `HttpOnly`.
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
    /** Las clases de evento de la agenda. */
    eventCategories: '/catalog/event-category/',
    /** Lo que puede dar un cupón. */
    benefitTypes: '/catalog/benefit-type/',
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
    /** El QR de su insignia (F6); `404` si el lugar no da insignia. */
    qr: (placeId: string) => `/place/${id(placeId)}/qr/`,
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
  /**
   * Los circuitos oficiales del portal (F4, docs/territorio.md): el equipo con `circuits.view` los ve
   * todos y una alcaldía verificada, los de su ciudad. `DELETE` lo retira para siempre.
   */
  officialCircuit: {
    list: '/official-circuit/',
    detail: (circuitId: string) => `/official-circuit/${id(circuitId)}/`,
    /** Sus próximas salidas de guía, también las canceladas y aunque ya no esté publicado. */
    departures: (circuitId: string) => `/official-circuit/${id(circuitId)}/departure/`,
  },
  /** Los publicados como los ve la app, sin sesión ni paginar. */
  publishedCircuits: '/circuit/',
  /** Las próximas salidas de guía de un circuito publicado (F7, docs/servicios.md): las publican los guías. */
  circuitDepartures: (circuitId: string) => `/circuit/${id(circuitId)}/departure/`,
  /**
   * La agenda cultural del portal (F6, docs/agenda-y-recompensas.md): el equipo con `content.moderate`
   * ve todos y los oculta; una institución o una alcaldía verificada programa los suyos.
   */
  culturalEvent: {
    list: '/cultural-event/',
    detail: (eventId: string) => `/cultural-event/${id(eventId)}/`,
    cancel: (eventId: string) => `/cultural-event/${id(eventId)}/cancel/`,
    clone: (eventId: string) => `/cultural-event/${id(eventId)}/clone/`,
    hide: (eventId: string) => `/cultural-event/${id(eventId)}/hide/`,
    show: (eventId: string) => `/cultural-event/${id(eventId)}/show/`,
  },
  /**
   * Las campañas de cupones del comercio (F6): hasta tres activas; el equipo con `content.moderate`
   * ve todas y las retira.
   */
  couponCampaign: {
    list: '/coupon-campaign/',
    detail: (campaignId: string) => `/coupon-campaign/${id(campaignId)}/`,
    withdraw: (campaignId: string) => `/coupon-campaign/${id(campaignId)}/withdraw/`,
  },
  /** Los cupones que entregó el comercio y la validación en el mostrador (consume el código). */
  couponRedemption: {
    list: '/coupon-redemption/',
    validate: '/coupon-redemption/validate/',
  },
  badges: {
    activations: '/api/badge-activations',
    cancelActivation: (activationId: string) => `/api/badge-activations/${id(activationId)}/cancel`,
    campaigns: '/api/badge-campaigns',
    cancelCampaign: (campaignId: string) => `/api/badge-campaigns/${id(campaignId)}/cancel`,
  },
  /**
   * Las finanzas (F8, docs/finanzas.md): el equipo con `billing.view` ve y con `billing.manage` actúa;
   * el comercio ve sus propios estados de cuenta.
   */
  payment: {
    list: '/payment/',
    confirm: (paymentId: string) => `/payment/${id(paymentId)}/confirm/`,
    refund: (paymentId: string) => `/payment/${id(paymentId)}/refund/`,
  },
  guideWithdrawal: {
    list: '/guide-withdrawal/',
    pay: (withdrawalId: string) => `/guide-withdrawal/${id(withdrawalId)}/pay/`,
    reject: (withdrawalId: string) => `/guide-withdrawal/${id(withdrawalId)}/reject/`,
  },
  billing: {
    statements: '/billing/statement/',
    pay: (statementId: string) => `/billing/statement/${id(statementId)}/pay/`,
  },
  /** Las tarifas: `GET` y `PUT` (sólo cambian las que llegan). */
  pricing: '/pricing/',
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
  /** Las reseñas que el reseñado impugnó (F7): las resuelve el equipo con `content.moderate`. */
  reviewDispute: {
    list: '/review-dispute/',
    resolve: (disputeId: string) => `/review-dispute/${id(disputeId)}/resolve/`,
  },
  visitEvents: '/api/visit-events',
  /** Sólo existe en el modo demo. */
  demoReset: '/api/demo/reset',
  /** Sólo existe en el modo demo: hace de equipo y resuelve la solicitud de quien entró. */
  demoDecision: '/api/demo/application-decision',
  /** Sólo existe en el modo demo: el "almacenamiento" que recibe los archivos firmados. */
  demoBucket: '/api/demo/bucket',
} as const
