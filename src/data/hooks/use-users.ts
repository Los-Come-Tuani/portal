import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AccountFilters, AccountNameInput, StaffInviteInput, StaffRoleInput } from '../models'
import { accountsRepository, staffRepository, staffRolesRepository } from '../repositories/users.repository'
import { queryKeys } from './query-keys'

// ── Todas las cuentas ─────────────────────────────────────────────────────

export function useAccounts(filters: AccountFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.accounts.list(filters),
    queryFn: () => accountsRepository.list(filters),
    placeholderData: keepPreviousData,
    enabled,
  })
}

/** Una cuenta que cambia también cambia el equipo (estado, nombre). */
function useRefreshAccounts() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.staffMembers })
  }
}

export function useRenameAccount() {
  const refresh = useRefreshAccounts()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AccountNameInput }) => accountsRepository.rename(id, input),
    onSuccess: refresh,
  })
}

export function useSetAccountStatus() {
  const refresh = useRefreshAccounts()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'suspended' }) => accountsRepository.setStatus(id, status),
    onSuccess: refresh,
  })
}

export function useSendPasswordReset() {
  return useMutation({ mutationFn: (userId: string) => accountsRepository.sendPasswordReset(userId) })
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
