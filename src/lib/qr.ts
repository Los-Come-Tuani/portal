import { create } from 'qrcode'

/** Los módulos del QR como un solo path SVG de cuadros de 1×1. */
export function qrPath(text: string): { size: number; d: string } {
  const { modules } = create(text, { errorCorrectionLevel: 'M' })
  const commands: string[] = []
  for (let row = 0; row < modules.size; row++) {
    for (let col = 0; col < modules.size; col++) {
      if (modules.get(row, col)) commands.push(`M${col} ${row}h1v1h-1z`)
    }
  }
  return { size: modules.size, d: commands.join('') }
}
