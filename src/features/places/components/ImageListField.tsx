import { ArrowDown, ArrowUp, ImageOff, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button, IconButton, Input, Tag } from '@/components/ui'
import { imageUrlSchema } from '@/data/schemas/common'

interface ImageListFieldProps {
  value: string[]
  onChange: (value: string[]) => void
  error?: string
  max?: number
}

/**
 * Fotos por URL mientras no haya backend para subir archivos. La primera es
 * la portada, igual que en la app.
 */
export function ImageListField({ value, onChange, error, max = 8 }: ImageListFieldProps) {
  const [draft, setDraft] = useState('')
  const [draftError, setDraftError] = useState<string | null>(null)
  const [broken, setBroken] = useState<Set<string>>(new Set())

  const add = () => {
    const url = draft.trim()
    const parsed = imageUrlSchema.safeParse(url)
    if (!parsed.success) {
      setDraftError('Pega una dirección que empiece con https://')
      return
    }
    if (value.includes(url)) {
      setDraftError('Esa foto ya está en la lista')
      return
    }
    onChange([...value, url])
    setDraft('')
    setDraftError(null)
  }

  const move = (index: number, direction: -1 | 1) => {
    const next = [...value]
    const [item] = next.splice(index, 1)
    next.splice(index + direction, 0, item)
    onChange(next)
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-small font-medium text-ink">Fotos</legend>
      {value.length > 0 && (
        <ol className="grid gap-2 sm:grid-cols-2">
          {value.map((url, index) => (
            <li key={url} className="flex items-center gap-3 rounded-kp border border-divider bg-surface p-2">
              {broken.has(url) ? (
                <span className="flex size-16 shrink-0 items-center justify-center rounded-sm bg-placeholder text-muted">
                  <ImageOff size={18} aria-label="No se pudo cargar" />
                </span>
              ) : (
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  onError={() => setBroken((current) => new Set(current).add(url))}
                  className="size-16 shrink-0 rounded-sm bg-placeholder object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                {index === 0 && <Tag tone="ink">Portada</Tag>}
                <p className="mt-1 truncate text-caption text-muted" title={url}>
                  {url.replace(/^https?:\/\//, '')}
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
                onClick={() => onChange(value.filter((item) => item !== url))}
                className="text-danger hover:bg-danger/8"
              />
            </li>
          ))}
        </ol>
      )}

      {value.length < max && (
        <div className="flex gap-2">
          <Input
            type="url"
            inputMode="url"
            placeholder="https://… dirección de la foto"
            aria-label="Dirección de una foto nueva"
            aria-invalid={draftError ? true : undefined}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
              setDraftError(null)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                add()
              }
            }}
            className="flex-1"
          />
          <Button variant="secondary" icon={<Plus size={16} />} onClick={add}>
            Agregar
          </Button>
        </div>
      )}
      {(draftError || error) && <p className="text-caption font-medium text-danger">{draftError ?? error}</p>}
      <p className="text-caption text-muted">
        La primera es la portada: es la que ve el turista en la lista de lugares. Pega la dirección web de cada foto.
      </p>
    </fieldset>
  )
}
