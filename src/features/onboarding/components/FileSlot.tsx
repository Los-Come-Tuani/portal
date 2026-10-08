import { FileText, ImageIcon, RefreshCw, Upload } from 'lucide-react'
import { useEffect, useId, useState, type DragEvent } from 'react'
import { Spinner } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useUploadFile } from '@/data/hooks/use-applications'
import { UPLOAD_RULES, type StoredFile, type UploadKind } from '@/data/models'
import { cn } from '@/lib/cn'

interface FileSlotProps {
  kind: UploadKind
  label: string
  value: StoredFile | null
  onChange: (value: StoredFile | null) => void
  error?: string
}

const acceptOf = (kind: UploadKind) => UPLOAD_RULES[kind].contentTypes.join(',')

const IS_IMAGE = /\.(jpe?g|png|webp)$/i

/**
 * Un archivo que se sube directo al almacenamiento: se elige o se arrastra, y lo que queda en el
 * formulario es su clave. Al corregir una solicitud trae el que ya se mandó, con su enlace de lectura.
 */
export function FileSlot({ kind, label, value, onChange, error }: FileSlotProps) {
  const inputId = useId()
  const errorId = useId()
  const upload = useUploadFile(kind)
  const [dragging, setDragging] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  // Lo que se acaba de elegir se ve al instante, sin esperar un enlace de lectura.
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview])

  const send = (file: File | undefined) => {
    if (!file) return
    setProblem(null)
    upload.mutate(file, {
      onSuccess: (stored) => {
        setPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null)
        onChange(stored)
      },
      onError: (caught) => setProblem(errorMessage(caught)),
    })
  }

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragging(false)
    send(event.dataTransfer.files[0])
  }

  const shown = error ?? problem
  const imageUrl = preview ?? (value && IS_IMAGE.test(value.key) ? value.url : null)

  const input = (
    <input
      id={inputId}
      type="file"
      accept={acceptOf(kind)}
      className="sr-only"
      aria-describedby={shown ? errorId : undefined}
      onChange={(event) => {
        send(event.target.files?.[0])
        event.target.value = ''
      }}
    />
  )

  return (
    <div className="flex flex-col gap-2">
      <span className="text-small font-medium text-ink">{label}</span>
      {value ? (
        <div className="flex items-center gap-3 rounded-kp border border-divider bg-canvas/60 p-2">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="size-14 shrink-0 rounded-sm bg-placeholder object-cover" />
          ) : (
            <span className="flex size-14 shrink-0 items-center justify-center rounded-sm bg-paper text-ink" aria-hidden="true">
              {IS_IMAGE.test(value.fileName) ? <ImageIcon size={20} /> : <FileText size={20} />}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-small font-semibold text-ink">{value.fileName}</span>
            {value.url ? (
              <a href={value.url} target="_blank" rel="noreferrer" className="text-caption font-semibold text-brand-strong hover:underline">
                Ver el archivo
              </a>
            ) : (
              <span className="text-caption text-muted">Subido</span>
            )}
          </span>
          {input}
          <label
            htmlFor={inputId}
            className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-kp px-3 text-small font-semibold text-ink transition-colors duration-150 hover:bg-ink/6 focus-within:outline-2 focus-within:outline-focus"
          >
            {upload.isPending ? <Spinner size={16} /> : <RefreshCw size={15} aria-hidden="true" />}
            Cambiar
            <span className="sr-only"> {label.toLowerCase()}</span>
          </label>
        </div>
      ) : (
        <div>
          {input}
          <label
            htmlFor={inputId}
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              'flex min-h-20 cursor-pointer items-center justify-center gap-2 rounded-kp border border-dashed px-3 py-4 text-center text-small transition-colors duration-150',
              'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink',
              dragging ? 'border-ink bg-paper text-ink' : shown ? 'border-danger/60 text-muted' : 'border-outline text-muted hover:border-ink/50 hover:text-ink',
            )}
          >
            {upload.isPending ? <Spinner size={16} /> : <Upload size={16} aria-hidden="true" />}
            <span>
              <span className="font-semibold text-ink">{upload.isPending ? 'Subiendo…' : 'Elige el archivo'}</span>
              {!upload.isPending && ' o arrástralo aquí'}
            </span>
          </label>
        </div>
      )}
      {shown && (
        <p id={errorId} className="text-caption font-medium text-danger">
          {shown}
        </p>
      )}
    </div>
  )
}
