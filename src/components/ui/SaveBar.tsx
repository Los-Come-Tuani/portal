import { useEffect } from 'react'
import { Button } from './Button'

interface SaveBarProps {
  visible: boolean
  saving: boolean
  onSave: () => void
  onDiscard: () => void
  message?: string
  saveLabel?: string
  discardLabel?: string
}

/** Barra fija abajo cuando hay cambios sin guardar. */
export function SaveBar({
  visible,
  saving,
  onSave,
  onDiscard,
  message = 'Tienes cambios sin guardar',
  saveLabel = 'Guardar cambios',
  discardLabel = 'Descartar',
}: SaveBarProps) {
  useEffect(() => {
    if (!visible) return
    document.body.dataset.savebar = ''
    return () => {
      delete document.body.dataset.savebar
    }
  }, [visible])

  if (!visible) return null
  return (
    <div className="sticky bottom-4 z-20 mt-6 flex animate-rise flex-wrap items-center justify-between gap-3 rounded-panel bg-ink px-4 py-4 sm:px-6 text-canvas shadow-pop">
      <p className="text-body font-medium">{message}</p>
      <div className="flex max-w-full flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={onDiscard} disabled={saving} className="text-canvas hover:bg-canvas/10">
          {discardLabel}
        </Button>
        <Button onClick={onSave} loading={saving}>
          {saveLabel}
        </Button>
      </div>
    </div>
  )
}
