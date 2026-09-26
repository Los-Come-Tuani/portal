/**
 * Escaneos de muestra para la demo: la API real devuelve la URL del archivo
 * que se subió. Son SVG genéricos con marca de agua "MUESTRA", no réplicas de
 * documentos oficiales.
 */
import { formatDate } from '@/lib/format'
import type { DocumentPage, DocumentTypeInfo } from '../../models'

export interface ScanData {
  info: DocumentTypeInfo
  /** A nombre de quién está: la persona o la razón social. */
  name: string
  city: string
  number: string
  issuedOn: string
  expiresOn: string | null
  /** El texto de una constancia o certificado. */
  body: string
}

const PAPER = '#f6f3ec'
const INK = '#2a2c2e'
const SOFT = '#6f6b62'
const RULE = '#cfc8b8'

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function toUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function watermark(width: number, height: number): string {
  return `<text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-size="${Math.round(width / 9)}" font-weight="700" fill="${INK}" fill-opacity="0.06" transform="rotate(-24 ${width / 2} ${height / 2})">MUESTRA · DEMO</text>`
}

function field(x: number, y: number, label: string, value: string, size = 22): string {
  return `<text x="${x}" y="${y}" font-size="15" fill="${SOFT}">${escape(label)}</text><text x="${x}" y="${y + size + 6}" font-size="${size}" font-weight="600" fill="${INK}">${escape(value)}</text>`
}

function wrap(text: string, max: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    if ((line + ' ' + word).trim().length > max) {
      lines.push(line.trim())
      line = word
    } else line += ` ${word}`
  }
  if (line.trim()) lines.push(line.trim())
  return lines
}

const svg = (width: number, height: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Helvetica, Arial, sans-serif"><rect width="${width}" height="${height}" fill="${PAPER}"/>${body}${watermark(width, height)}</svg>`

function cardFront(data: ScanData): string {
  return svg(
    856,
    540,
    `<rect x="14" y="14" width="828" height="512" rx="22" fill="none" stroke="${RULE}" stroke-width="2"/>
     <text x="48" y="70" font-size="20" fill="${SOFT}">${escape(data.info.issuer)}</text>
     <text x="48" y="104" font-size="30" font-weight="700" fill="${INK}">${escape(data.info.label)}</text>
     <rect x="48" y="140" width="200" height="260" rx="10" fill="#e4dfd3"/>
     <circle cx="148" cy="238" r="52" fill="#cbc4b4"/>
     <path d="M68 400 C 80 318, 216 318, 228 400 Z" fill="#cbc4b4"/>
     ${field(290, 170, 'Nombre', data.name, 30)}
     ${field(290, 260, 'Número', data.number)}
     ${field(290, 340, 'Emisión', formatDate(data.issuedOn))}
     ${data.expiresOn ? field(520, 340, 'Vence', formatDate(data.expiresOn)) : ''}
     <path d="M290 470 c 30 -30, 50 20, 80 -8 s 40 -20, 60 6 s 30 10, 50 -10" fill="none" stroke="${INK}" stroke-width="2.5"/>
     <text x="290" y="500" font-size="14" fill="${SOFT}">Firma del titular</text>`,
  )
}

function cardBack(data: ScanData): string {
  const bars = Array.from({ length: 46 }, (_, index) => {
    const width = [2, 4, 3, 6][(index * 7) % 4]
    return `<rect x="${48 + index * 16}" y="380" width="${width}" height="96" fill="${INK}"/>`
  }).join('')
  return svg(
    856,
    540,
    `<rect x="14" y="14" width="828" height="512" rx="22" fill="none" stroke="${RULE}" stroke-width="2"/>
     ${field(48, 80, 'Domicilio', `${data.city}, Nicaragua`)}
     ${field(48, 170, 'Número', data.number)}
     ${field(48, 260, 'Lugar de emisión', data.city)}
     <rect x="560" y="60" width="240" height="240" rx="12" fill="none" stroke="${RULE}" stroke-width="2" stroke-dasharray="8 8"/>
     <text x="680" y="190" text-anchor="middle" font-size="16" fill="${SOFT}">Huella</text>
     ${bars}`,
  )
}

function sheet(data: ScanData): string {
  const lines = wrap(data.body, 52)
  return svg(
    850,
    1100,
    `<text x="425" y="120" text-anchor="middle" font-size="22" fill="${SOFT}">${escape(data.info.issuer)}</text>
     <line x1="120" y1="150" x2="730" y2="150" stroke="${RULE}" stroke-width="2"/>
     <text x="425" y="230" text-anchor="middle" font-size="38" font-weight="700" fill="${INK}">${escape(data.info.label)}</text>
     <text x="425" y="272" text-anchor="middle" font-size="20" fill="${SOFT}">N.º ${escape(data.number)}</text>
     ${lines.map((line, index) => `<text x="120" y="${380 + index * 44}" font-size="24" fill="${INK}">${escape(line)}</text>`).join('')}
     <text x="120" y="${420 + lines.length * 44}" font-size="20" fill="${SOFT}">Emitido el ${formatDate(data.issuedOn)}${data.expiresOn ? ` · vence el ${formatDate(data.expiresOn)}` : ''}</text>
     <circle cx="640" cy="900" r="78" fill="none" stroke="${SOFT}" stroke-opacity="0.5" stroke-width="3"/>
     <circle cx="640" cy="900" r="62" fill="none" stroke="${SOFT}" stroke-opacity="0.4" stroke-width="2" stroke-dasharray="6 6"/>
     <path d="M140 920 c 40 -40, 70 30, 110 -12 s 60 -26, 90 8" fill="none" stroke="${INK}" stroke-width="2.5"/>
     <line x1="120" y1="950" x2="420" y2="950" stroke="${RULE}" stroke-width="2"/>
     <text x="120" y="980" font-size="18" fill="${SOFT}">Firma autorizada</text>`,
  )
}

export function documentScans(data: ScanData): DocumentPage[] {
  const pages = data.info.pages
  if (data.info.format === 'card' && pages?.includes('Reverso')) {
    return [
      { label: pages[0], url: toUrl(cardFront(data)) },
      { label: pages[1], url: toUrl(cardBack(data)) },
    ]
  }
  return [
    {
      label: pages?.[0] ?? (data.info.format === 'card' ? 'Frente' : 'Página 1'),
      url: toUrl(data.info.format === 'card' ? cardFront(data) : sheet(data)),
    },
  ]
}
