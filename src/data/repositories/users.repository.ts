import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import type { StaffInviteInput, StaffRole, StaffRoleInput, User, UserRole, UserStatus, UserUpdate } from '../models'

export interface UserFilters {
  role?: UserRole
  status?: UserStatus
  q?: string
}

export const usersRepository = {
  list: (filters: UserFilters = {}) => http.get<User[]>(endpoints.users.list, { query: { ...filters } }),
  get: (userId: string) => http.get<User>(endpoints.users.detail(userId)),
  update: (userId: string, input: UserUpdate) => http.patch<User>(endpoints.users.detail(userId), { body: input }),
  sendPasswordReset: (userId: string) => http.post<void>(endpoints.users.passwordReset(userId)),
  inviteStaff: (input: StaffInviteInput) => http.post<User>(endpoints.users.staffInvite, { body: input }),
}

export const staffRolesRepository = {
  list: () => http.get<StaffRole[]>(endpoints.staffRoles.list),
  create: (input: StaffRoleInput) => http.post<StaffRole>(endpoints.staffRoles.list, { body: input }),
  update: (roleId: string, input: StaffRoleInput) => http.put<StaffRole>(endpoints.staffRoles.detail(roleId), { body: input }),
  remove: (roleId: string) => http.delete(endpoints.staffRoles.detail(roleId)),
}
