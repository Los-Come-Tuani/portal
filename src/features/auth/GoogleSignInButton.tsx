import { useEffect, useState } from 'react'
import { env } from '@/config/env'
import { cn } from '@/lib/cn'
import { chooseGoogleAccount, loadGoogleAccounts } from './google-identity'

interface GoogleSignInButtonProps {
  disabled?: boolean
  /** El token de acceso de la cuenta elegida; el API lo valida con Google. */
  onAccessToken: (accessToken: string) => void
  onError: (message: string) => void
}

/**
 * "Continuar con Google" con el selector de cuentas de Google: cada clic deja elegir cualquier
 * cuenta, también otra después de un intento rechazado. Sigue la guía de marca de Google (logo,
 * texto y colores del botón "outline").
 */
export function GoogleSignInButton({ disabled = false, onAccessToken, onError }: GoogleSignInButtonProps) {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    if (!env.googleClientId) return
    let cancelled = false
    loadGoogleAccounts().then(
      () => !cancelled && setState('ready'),
      () => !cancelled && setState('failed'),
    )
    return () => {
      cancelled = true
    }
  }, [])

  if (!env.googleClientId) return null

  const choose = () => {
    chooseGoogleAccount(env.googleClientId).then(
      (token) => token && onAccessToken(token),
      (error: Error) => onError(error.message),
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={choose}
        disabled={disabled || state !== 'ready'}
        className={cn(
          'flex h-11 w-full items-center justify-center gap-3 rounded-kp border border-[#747775] bg-white px-4 text-[14px] font-medium text-[#1f1f1f] transition-colors duration-150',
          'hover:bg-[#f8faff] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        )}
      >
        <GoogleLogo />
        Continuar con Google
      </button>
      {state === 'failed' && (
        <p role="alert" className="mt-2 text-small font-medium text-danger">
          No se pudo cargar Google. Recarga la página e intenta de nuevo.
        </p>
      )}
    </div>
  )
}

/** La "G" de Google, como la pide su guía de marca. */
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}
