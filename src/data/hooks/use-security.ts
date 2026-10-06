import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ChangePasswordInput, DisableTwoFactorInput, ResetPasswordInput } from '../models'
import { authRepository } from '../repositories/auth.repository'
import { securityRepository } from '../repositories/security.repository'
import { queryKeys } from './query-keys'

export function useTwoFactorStatus() {
  return useQuery({ queryKey: queryKeys.security.twoFactor, queryFn: securityRepository.twoFactorStatus })
}

/** Cada paso del 2FA cambia el estado: se vuelve a pedir. */
function useInvalidateTwoFactor() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.security.twoFactor })
}

export function useStartTwoFactor() {
  const invalidate = useInvalidateTwoFactor()
  return useMutation({ mutationFn: securityRepository.startTwoFactor, onSuccess: invalidate })
}

export function useConfirmTwoFactor() {
  const invalidate = useInvalidateTwoFactor()
  return useMutation({ mutationFn: (code: string) => securityRepository.confirmTwoFactor(code), onSuccess: invalidate })
}

export function useRegenerateRecoveryCodes() {
  const invalidate = useInvalidateTwoFactor()
  return useMutation({ mutationFn: (code: string) => securityRepository.regenerateRecoveryCodes(code), onSuccess: invalidate })
}

export function useDisableTwoFactor() {
  const invalidate = useInvalidateTwoFactor()
  return useMutation({ mutationFn: (input: DisableTwoFactorInput) => securityRepository.disableTwoFactor(input), onSuccess: invalidate })
}

export function useChangePassword() {
  return useMutation({ mutationFn: (input: ChangePasswordInput) => authRepository.changePassword(input) })
}

export function useRevokeSessions() {
  return useMutation({ mutationFn: authRepository.revokeSessions })
}

export function useForgotPassword() {
  return useMutation({ mutationFn: (email: string) => authRepository.forgotPassword(email) })
}

export function useResetPassword() {
  return useMutation({ mutationFn: (input: ResetPasswordInput) => authRepository.resetPassword(input) })
}
