import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { IconButton } from './IconButton'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** `sheet`: panel lateral para formularios largos. */
  variant?: 'center' | 'sheet'
  size?: 'sm' | 'md' | 'lg'
}

const CENTER_SIZES = { sm: 'w-[min(26rem,calc(100vw-2rem))]', md: 'w-[min(34rem,calc(100vw-2rem))]', lg: 'w-[min(46rem,calc(100vw-2rem))]' }
const SHEET_SIZES = { sm: 'w-[min(28rem,100vw)]', md: 'w-[min(36rem,100vw)]', lg: 'w-[min(44rem,100vw)]' }

/**
 * Sobre `<dialog>` nativo: atrapa el foco, cierra con Escape y devuelve el
 * foco al botón que lo abrió. El contenido sólo existe mientras está abierto.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = 'center',
  size = 'md',
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // showModal() enfoca el primer control (el botón de cerrar); se respeta el campo marcado.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  const sheet = variant === 'sheet'

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      className={cn(
        'max-h-none max-w-none overflow-hidden bg-surface p-0 text-ink shadow-pop backdrop:bg-ink/45',
        sheet
          ? cn('my-0 mr-0 ml-auto h-dvh', SHEET_SIZES[size], 'open:animate-slide-in')
          : cn('m-auto max-h-[calc(100dvh-2rem)] rounded-lg', CENTER_SIZES[size], 'open:animate-rise'),
      )}
    >
      {open && (
        <div className={cn('flex flex-col', sheet ? 'h-full' : 'max-h-[calc(100dvh-2rem)]')}>
          <header className="flex items-start justify-between gap-4 border-b border-divider px-6 py-5">
            <div className="min-w-0">
              <h2 id={titleId} className="text-title font-semibold">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-1 text-small text-muted">
                  {description}
                </p>
              )}
            </div>
            <IconButton label="Cerrar" icon={<X size={18} />} size="sm" onClick={onClose} className="-mt-1 -mr-2" />
          </header>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && (
            <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-divider bg-canvas/50 px-6 py-4">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  )
}
