import { createContext, useContext } from 'react'

export interface ValidateCouponContextValue {
  open: (code?: string) => void
}

export const ValidateCouponContext = createContext<ValidateCouponContextValue | null>(null)

/** Abre "Validar cupón" desde cualquier pantalla (la barra superior, la lista de canjes…). */
export function useValidateCoupon(): ValidateCouponContextValue {
  const context = useContext(ValidateCouponContext)
  if (!context) throw new Error('useValidateCoupon necesita <ValidateCouponProvider>')
  return context
}
