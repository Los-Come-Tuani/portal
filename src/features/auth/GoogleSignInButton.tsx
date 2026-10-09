import { useEffect, useRef, useState } from 'react'
import { env } from '@/config/env'
import { loadGoogleIdentity } from './google-identity'

interface GoogleSignInButtonProps {
  disabled?: boolean
  onCredential: (credential: string) => void
}

/** Botón oficial de Google Identity Services; el token resultante se valida en el API. */
export function GoogleSignInButton({ disabled = false, onCredential }: GoogleSignInButtonProps) {
  const host = useRef<HTMLDivElement>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    if (!env.googleClientId) return

    let cancelled = false
    void loadGoogleIdentity()
      .then((identity) => {
        if (cancelled || !host.current) return
        host.current.replaceChildren()
        identity.initialize({
          client_id: env.googleClientId,
          // cada clic muestra las cuentas: tras un rechazo hay que poder elegir otra
          auto_select: false,
          button_auto_select: false,
          callback: ({ credential }) => {
            if (credential) onCredential(credential)
            else setLoadError(true)
          },
        })
        identity.renderButton(host.current, {
          locale: 'es',
          logo_alignment: 'left',
          shape: 'rectangular',
          size: 'large',
          text: 'continue_with',
          theme: 'outline',
          type: 'standard',
          width: Math.min(400, Math.max(240, host.current.clientWidth)),
        })
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })

    return () => {
      cancelled = true
    }
  }, [onCredential])

  if (!env.googleClientId) return null

  return (
    <div>
      <div
        ref={host}
        aria-busy={disabled || undefined}
        className={disabled ? 'pointer-events-none opacity-60' : undefined}
      />
      {loadError && (
        <p role="alert" className="mt-2 text-small font-medium text-danger">
          No se pudo cargar Google. Recarga la página e intenta de nuevo.
        </p>
      )}
    </div>
  )
}
