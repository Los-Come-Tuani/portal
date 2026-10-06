import { z } from 'zod'
import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import type { StaffInviteInput, StaffMember, StaffRole, StaffRoleInput, User, UserRole, UserStatus, UserUpdate } from '../models'
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

export interface UserFilters {
  role?: UserRole
  status?: UserStatus
  q?: string
}

/** Todas las cuentas ("Todos los usuarios"). El API todavía no tiene este directorio: solo hay demo. */
export const usersRepository = {
  list: (filters: UserFilters = {}) => http.get<User[]>(endpoints.users.list, { query: { ...filters } }),
  get: (userId: string) => http.get<User>(endpoints.users.detail(userId)),
  update: (userId: string, input: UserUpdate) => http.patch<User>(endpoints.users.detail(userId), { body: input }),
  sendPasswordReset: (userId: string) => http.post<void>(endpoints.users.passwordReset(userId)),
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
