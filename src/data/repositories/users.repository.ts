import { z } from 'zod'
import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import type { Account, AccountFilters, AccountNameInput, Page, StaffInviteInput, StaffMember, StaffRole, StaffRoleInput } from '../models'
import { accountNameBody, apiAccountPageSchema, apiAccountSchema, toAccount, toAccountPage } from '../schemas/account-api.schema'
import {
  apiInviteSchema,
  apiMemberSchema,
  apiRoleSchema,
  inviteBody,
  roleBody,
  roleReference,
  toMember,
  toRole,
} from '../schemas/team-api.schema'

/**
 * Todas las cuentas ("Todos los usuarios", docs/roles.md del repo del API). Los filtros los aplica
 * el API; suspender, reactivar y mandar un código de contraseña siguen en sus propias rutas.
 */
export const accountsRepository = {
  async list({ role, status, search, page, pageSize }: AccountFilters = {}): Promise<Page<Account>> {
    const data = await http.get<unknown>(endpoints.auth.accounts, {
      query: { role, status, search: search?.trim(), page, page_size: pageSize },
    })
    return toAccountPage(apiAccountPageSchema.parse(data))
  },

  async rename(userId: string, input: AccountNameInput): Promise<Account> {
    return toAccount(apiAccountSchema.parse(await http.patch<unknown>(endpoints.auth.account(userId), { body: accountNameBody(input) })))
  },

  /** Suspender corta de inmediato sus sesiones; la respuesta es la de una persona del equipo y no se lee. */
  async setStatus(userId: string, status: 'active' | 'suspended'): Promise<void> {
    await http.post<unknown>(endpoints.auth.userStatus, { body: { user_id: userId, status } })
  },

  sendPasswordReset: (userId: string) => http.post<void>(endpoints.auth.userPasswordReset, { body: { user_id: userId } }),
}

/** Los roles del equipo (docs/roles.md del repo del API). */
export const staffRolesRepository = {
  async list(): Promise<StaffRole[]> {
    return z.array(apiRoleSchema).parse(await http.get<unknown>(endpoints.auth.staffRoles)).map(toRole)
  },
  async create(input: StaffRoleInput): Promise<StaffRole> {
    return toRole(apiRoleSchema.parse(await http.post<unknown>(endpoints.auth.staffRoles, { body: roleBody(input) })))
  },
  async update(roleId: string, input: StaffRoleInput): Promise<StaffRole> {
    return toRole(apiRoleSchema.parse(await http.put<unknown>(endpoints.auth.staffRole(roleId), { body: roleBody(input) })))
  },
  remove: (roleId: string) => http.delete(endpoints.auth.staffRole(roleId)),
}

/** Las personas del equipo: invitarlas, cambiarles el rol y quitarles o devolverles el acceso. */
export const staffRepository = {
  async members(): Promise<StaffMember[]> {
    return z.array(apiMemberSchema).parse(await http.get<unknown>(endpoints.auth.staffMembers)).map(toMember)
  },

  /**
   * Invita a alguien (o vuelve a invitar a quien no ha aceptado: le cambia el rol y le manda otro
   * código). `sent` es falso si ya se le escribió hace menos de un minuto: usa el código anterior.
   */
  async invite(input: StaffInviteInput): Promise<{ member: StaffMember; sent: boolean }> {
    const data = apiInviteSchema.parse(await http.post<unknown>(endpoints.auth.staffInvite, { body: inviteBody(input) }))
    return { member: toMember(data), sent: data.sent }
  },

  async setRole(userId: string, roleId: string): Promise<StaffMember> {
    const data = await http.post<unknown>(endpoints.auth.userRole, { body: { user_id: userId, role_id: roleReference(roleId) } })
    return toMember(apiMemberSchema.parse(data))
  },

  async setStatus(userId: string, status: 'active' | 'suspended'): Promise<StaffMember> {
    const data = await http.post<unknown>(endpoints.auth.userStatus, { body: { user_id: userId, status } })
    return toMember(apiMemberSchema.parse(data))
  },
}
