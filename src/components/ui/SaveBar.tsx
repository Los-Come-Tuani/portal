import { Button } from './Button'

interface SaveBarProps {
  visible: boolean
  saving: boolean
  onSave: () => void
  onDiscard: () => void
  message?: string
}

/** Barra fija abajo cuando hay cambios sin guardar. */
export function SaveBar({ visible, saving, onSave, onDiscard, message = 'Tienes cambios sin guardar' }: SaveBarProps) {
  if (!visible) return null
  return (
    <div className="sticky bottom-4 z-20 mt-6 flex animate-rise flex-wrap items-center justify-between gap-3 rounded-kp bg-ink px-5 py-3 text-canvas shadow-pop">
      <p className="text-body font-medium">{message}</p>
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={onDiscard} disabled={saving} className="text-canvas hover:bg-canvas/10">
          Descartar
        </Button>
        <Button onClick={onSave} loading={saving}>
          Guardar cambios
        </Button>
      </div>
    </div>
  )
}
