import { ApiError } from './errors'

/** Lo que el backend de demo recibe por archivo: no hay servidor donde guardarlo, viaja como `data:`. */
export interface FilePayload {
  fileName: string
  mime: string
  dataUrl: string
}

const MAX_IMAGE_SIDE = 1600
const MAX_PDF_BYTES = 1_500_000

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new ApiError(0, 'No pudimos leer el archivo'))
    reader.readAsDataURL(file)
  })
}

/** Las fotos se achican para que quepan en el almacenamiento del navegador. */
async function shrinkImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.naturalWidth * scale)
    canvas.height = Math.round(image.naturalHeight * scale)
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.82)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function toFilePayload(file: File): Promise<FilePayload> {
  if (file.type.startsWith('image/')) {
    return { fileName: file.name, mime: 'image/jpeg', dataUrl: await shrinkImage(file) }
  }
  if (file.type === 'application/pdf') {
    if (file.size > MAX_PDF_BYTES) throw new ApiError(413, 'En el modo demo el PDF puede pesar hasta 1.5 MB. Prueba con una foto del documento.')
    return { fileName: file.name, mime: file.type, dataUrl: await readAsDataUrl(file) }
  }
  throw new ApiError(415, 'Sube una foto (JPG o PNG) o un PDF')
}
