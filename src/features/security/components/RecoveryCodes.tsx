import { Copy, Download } from 'lucide-react'
import { Button, useToast } from '@/components/ui'

/** Los códigos de recuperación, con copiar y descargar: la API solo los muestra una vez. */
export function RecoveryCodes({ codes }: { codes: readonly string[] }) {
  const toast = useToast()
  const text = codes.join('\n')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast({ title: 'Códigos copiados' })
    } catch {
      toast({ title: 'No pudimos copiarlos', description: 'Selecciónalos y cópialos a mano.', tone: 'error' })
    }
  }

  const download = () => {
    const file = new Blob([`Códigos de recuperación de K'Plan\n\n${text}\n`], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = 'kplan-codigos-de-recuperacion.txt'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body text-muted">
        Guárdalos en un lugar seguro. Cada código sirve una sola vez y esta es la única vez que los vas a ver.
      </p>
      <ul
        aria-label="Códigos de recuperación"
        className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-kp border border-divider bg-canvas p-4 sm:grid-cols-2"
      >
        {codes.map((code) => (
          <li key={code} className="font-mono text-small tracking-wide text-ink tabular-nums select-all">
            {code}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" icon={<Copy size={15} />} onClick={() => void copy()}>
          Copiar
        </Button>
        <Button variant="secondary" size="sm" icon={<Download size={15} />} onClick={download}>
          Descargar
        </Button>
      </div>
    </div>
  )
}
