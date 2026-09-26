import { useMemo, useState, type ReactNode } from 'react'
import { ValidateCouponDialog } from './components/ValidateCouponDialog'
import { ValidateCouponContext } from './validate-coupon-context'

export function ValidateCouponProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({ open: false, code: '', session: 0 })
  const value = useMemo(
    () => ({ open: (code = '') => setState((current) => ({ open: true, code, session: current.session + 1 })) }),
    [],
  )

  return (
    <ValidateCouponContext.Provider value={value}>
      {children}
      <ValidateCouponDialog
        key={state.session}
        open={state.open}
        initialCode={state.code}
        onClose={() => setState((current) => ({ ...current, open: false }))}
      />
    </ValidateCouponContext.Provider>
  )
}
