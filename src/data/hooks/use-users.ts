import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { StaffInviteInput, StaffRoleInput, UserUpdate } from '../models'
import { staffRolesRepository, usersRepository, type UserFilters } from '../repositories/users.repository'
import { queryKeys } from './query-keys'

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

export function useInviteStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: StaffInviteInput) => usersRepository.inviteStaff(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
  })
}

export function useStaffRoles(enabled = true) {
  return useQuery({ queryKey: queryKeys.staffRoles, queryFn: staffRolesRepository.list, enabled })
}

export function useSaveStaffRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: StaffRoleInput }) =>
      id ? staffRolesRepository.update(id, input) : staffRolesRepository.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.staffRoles }),
  })
}

export function useDeleteStaffRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (roleId: string) => staffRolesRepository.remove(roleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.staffRoles }),
  })
}
