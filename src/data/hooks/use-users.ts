import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { StaffInviteInput, StaffRoleInput, UserUpdate } from '../models'
import { staffRepository, staffRolesRepository, usersRepository, type UserFilters } from '../repositories/users.repository'
import { queryKeys } from './query-keys'

// ── Todas las cuentas (solo demo) ─────────────────────────────────────────

export function useUsers(filters: UserFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: () => usersRepository.list(filters),
    enabled,
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UserUpdate }) => usersRepository.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.staffRoles })
    },
  })
}

export function useSendPasswordReset() {
  return useMutation({ mutationFn: (userId: string) => usersRepository.sendPasswordReset(userId) })
}

// ── El equipo de K'Plan ───────────────────────────────────────────────────

export function useStaffMembers(enabled = true) {
  return useQuery({ queryKey: queryKeys.staffMembers, queryFn: staffRepository.members, enabled })
}

/** Invitar, cambiar el rol o el acceso cambia también cuántas personas tiene cada rol. */
function useRefreshTeam() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.staffMembers })
    queryClient.invalidateQueries({ queryKey: queryKeys.staffRoles })
  }
}

export function useInviteStaff() {
  const refresh = useRefreshTeam()
  return useMutation({ mutationFn: (input: StaffInviteInput) => staffRepository.invite(input), onSuccess: refresh })
}

export function useSetStaffRole() {
  const refresh = useRefreshTeam()
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) => staffRepository.setRole(userId, roleId),
    onSuccess: refresh,
  })
}

export function useSetStaffStatus() {
  const refresh = useRefreshTeam()
  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'active' | 'suspended' }) => staffRepository.setStatus(userId, status),
    onSuccess: refresh,
  })
}

export function useStaffRoles(enabled = true) {
  return useQuery({ queryKey: queryKeys.staffRoles, queryFn: staffRolesRepository.list, enabled })
}

export function useSaveStaffRole() {
  const refresh = useRefreshTeam()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: StaffRoleInput }) =>
      id ? staffRolesRepository.update(id, input) : staffRolesRepository.create(input),
    onSuccess: refresh,
  })
}

export function useDeleteStaffRole() {
  const refresh = useRefreshTeam()
  return useMutation({ mutationFn: (roleId: string) => staffRolesRepository.remove(roleId), onSuccess: refresh })
}
