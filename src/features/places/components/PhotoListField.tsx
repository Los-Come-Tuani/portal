import { ArrowDown, ArrowUp, ImageOff, ImagePlus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button, IconButton, Tag } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { uploadFile, uploadProblem } from '@/data/api/upload'
import type { Photo } from '@/data/models'

interface PhotoListFieldProps {
  value: Photo[]
  onChange: (value: Photo[]) => void
  /** La clase de archivo del almacenamiento: fotos de lugares, circuitos, eventos o cupones. */
  kind: 'place-photo' | 'circuit-photo' | 'event-photo' | 'coupon-photo'
  error?: string
  max?: number
  label?: string
}

/**
 * Las fotos de un lugar o un circuito. Cada una se sube al almacenamiento al elegirla y viaja por
 * su clave al guardar; las que ya tenía se quedan como estaban. La primera es la portada.
 */
export function PhotoListField({ value, onChange, kind, error, max = 8, label = 'Fotos' }: PhotoListFieldProps) {
  const input = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [broken, setBroken] = useState<Set<string>>(new Set())

  const pick = async (files: FileList | null) => {
    const file = files?.[0]
    if (input.current) input.current.value = ''
    if (!file) return
    const local = uploadProblem(kind, file)
    if (local) {
      setProblem(local)
      return
    }
    setProblem(null)
    setUploading(true)
    try {
      const stored = await uploadFile(kind, file)
      onChange([...value, { key: stored.key, url: URL.createObjectURL(file) }])
    } catch (failure) {
      setProblem(errorMessage(failure))
    } finally {
      setUploading(false)
    }
  }

  const move = (index: number, direction: -1 | 1) => {
    const next = [...value]
    const [item] = next.splice(index, 1)
    next.splice(index + direction, 0, item)
    onChange(next)
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-small font-medium text-ink">{label}</legend>
      {value.length > 0 && (
        <ol className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
          {value.map((photo, index) => (
            <li key={photo.key} className="flex min-w-0 items-center gap-3 rounded-kp border border-divider bg-surface p-2">
              {!photo.url || broken.has(photo.key) ? (
                <span className="flex size-16 shrink-0 items-center justify-center rounded-sm bg-placeholder text-muted">
                  <ImageOff size={18} aria-label={photo.url ? 'No se pudo cargar' : 'Sin vista previa'} />
                </span>
              ) : (
                <img
                  src={photo.url}
                  alt=""
                  loading="lazy"
                  onError={() => setBroken((current) => new Set(current).add(photo.key))}
                  className="size-16 shrink-0 rounded-sm bg-placeholder object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                {index === 0 && <Tag tone="ink">Portada</Tag>}
                <p className="mt-1 truncate text-caption text-muted" title={photo.key}>
                  {photo.key.replace(/^https?:\/\//, '').split('/').pop()}
                </p>
              </div>
              <div className="flex shrink-0 flex-col">
                <IconButton size="sm" label="Subir" icon={<ArrowUp size={15} />} disabled={index === 0} onClick={() => move(index, -1)} />
                <IconButton
                  size="sm"
                  label="Bajar"
                  icon={<ArrowDown size={15} />}
                  disabled={index === value.length - 1}
                  onClick={() => move(index, 1)}
                />
              </div>
              <IconButton
                size="sm"
                label="Quitar foto"
                icon={<Trash2 size={15} />}
                onClick={() => onChange(value.filter((item) => item.key !== photo.key))}
                tone="danger"
              />
            </li>
          ))}
        </ol>
      )}

      {value.length < max && (
        <div>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-label="Elegir una foto"
            onChange={(event) => void pick(event.target.files)}
          />
          <Button variant="secondary" icon={<ImagePlus size={16} />} loading={uploading} onClick={() => input.current?.click()}>
            {uploading ? 'Subiendo…' : 'Agregar foto'}
          </Button>
        </div>
      )}
      {(problem || error) && (
        <p role="alert" className="text-caption font-medium text-danger">
          {problem ?? error}
        </p>
      )}
      <p className="text-caption text-muted">La primera es la portada: es la que ve el turista en la lista. Fotos JPG, PNG o WebP de hasta 5 MB.</p>
    </fieldset>
  )
}
