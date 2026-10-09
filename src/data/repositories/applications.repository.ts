import { z } from 'zod'
import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import type { ApplicantInput, CatalogCity, CatalogOption, MyApplication, OrganizationData, SessionUser } from '../models'
import {
  apiApplicationSchema,
  apiApplicationSessionSchema,
  apiCitySchema,
  apiOptionSchema,
  applicationBody,
  resubmitBody,
  toMyApplication,
  toSummary,
} from '../schemas/application-api.schema'
import { toSessionUser } from '../schemas/session.schema'

/** La solicitud con la que un comercio, una institución cultural o una alcaldía entra a K'Plan. */
export const applicationsRepository = {
  // Las listas de los formularios son públicas: se leen antes de tener cuenta.
  async cities(): Promise<CatalogCity[]> {
    return z.array(apiCitySchema).parse(await http.get<unknown>(endpoints.catalog.cities))
  },
  async businessTypes(): Promise<CatalogOption[]> {
    return z.array(apiOptionSchema).parse(await http.get<unknown>(endpoints.catalog.businessTypes))
  },
  async institutionTypes(): Promise<CatalogOption[]> {
    return z.array(apiOptionSchema).parse(await http.get<unknown>(endpoints.catalog.institutionTypes))
  },

  /**
   * Si el alta pide el código del correo. Un API desplegado sin correo (como develop-api) no puede
   * mandarlo, y entonces se sigue sin él con `SKIPPED_SIGNUP_CODE`.
   */
  async signupCodeRequired(): Promise<boolean> {
    const data = z.object({ code_required: z.boolean() }).parse(await http.get<unknown>(endpoints.auth.registerCode))
    return data.code_required
  },

  /** Manda el código de seis dígitos al correo; responde igual exista o no la cuenta. */
  requestCode: (email: string) => http.post<unknown>(endpoints.auth.registerCode, { body: { email: email.trim() } }),

  /** Comprueba el código sin gastarlo, para saber si se puede seguir con el formulario. */
  verifyCode: (email: string, code: string) =>
    http.post<void>(endpoints.auth.registerVerify, { body: { email: email.trim(), code: code.trim() } }),

  /**
   * Crea la cuenta, la organización sin verificar y su solicitud, y deja la sesión abierta en
   * cookies: quien se postula entra con acceso limitado a su solicitud mientras el equipo revisa.
   */
  async apply(
    applicant: ApplicantInput,
    data: OrganizationData,
  ): Promise<{ user: SessionUser; application: Omit<MyApplication, 'submitted'> }> {
    const response = apiApplicationSessionSchema.parse(
      await http.post<unknown>(endpoints.organizationApplication[data.kind], { body: applicationBody(applicant, data) }),
    )
    return { user: toSessionUser(response.user), application: toSummary(response.application) }
  },

  /** La solicitud más reciente de quien entró, con lo que mandó. */
  async mine(): Promise<MyApplication> {
    return toMyApplication(apiApplicationSchema.parse(await http.get<unknown>(endpoints.organizationApplication.mine)))
  },

  /** Corrige lo rechazado y lo manda de nuevo: abre otro expediente y devuelve la solicitud nueva. */
  async resubmit(data: OrganizationData): Promise<MyApplication> {
    return toMyApplication(
      apiApplicationSchema.parse(await http.post<unknown>(endpoints.organizationApplication.resubmit, { body: resubmitBody(data) })),
    )
  },
}
