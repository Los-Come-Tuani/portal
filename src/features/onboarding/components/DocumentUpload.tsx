import { FileText, IdCard, RefreshCw, Trash2, Upload } from 'lucide-react'
import { useId, useState, type DragEvent } from 'react'
import { IconButton, Spinner } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useUploadFile } from '@/data/hooks/use-admissions'
import {
  documentPages,
  ORGANIZATION_DOCUMENT_INFO,
  type ApplicationDocumentInput,
  type DocumentPage,
  type OrganizationDocumentType,
} from '@/data/models'
import { cn } from '@/lib/cn'

interface DocumentUploadProps {
  type: OrganizationDocumentType
  value: ApplicationDocumentInput | undefined
  onChange: (value: ApplicationDocumentInput | null) => void
  required: boolean
  error?: string
  /** `inline`: sólo las ranuras, para ir dentro de una fila que ya nombra el documento. */
  variant?: 'card' | 'inline'
}

const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'

/** Un documento, con una ranura por cara: la cédula pide frente y reverso. */
export function DocumentUpload({ type, value, onChange, required, error, variant = 'card' }: DocumentUploadProps) {
  const info = ORGANIZATION_DOCUMENT_INFO[type]
  const labels = documentPages(type)
  const Icon = info.format === 'card' ? IdCard : FileText
  const errorId = useId()

  const setPage = (page: DocumentPage, fileName: string) => {
    const pages = [...(value?.pages ?? []).filter((item) => item.label !== page.label), page].sort(
      (a, b) => labels.indexOf(a.label) - labels.indexOf(b.label),
    )
    onChange({ type, fileName: value?.fileName ?? fileName, pages })
  }

  const removePage = (label: string) => {
    const pages = (value?.pages ?? []).filter((item) => item.label !== label)
    onChange(pages.length > 0 && value ? { ...value, pages } : null)
  }

  const slots = (
    <div className={cn('grid gap-3', labels.length > 1 && 'sm:grid-cols-2')}>
      {labels.map((label) => (
        <PageSlot
          key={label}
          label={labels.length > 1 ? label : 'Archivo'}
          page={value?.pages.find((item) => item.label === label)}
          fileName={value?.fileName}
          onUploaded={(url, fileName) => setPage({ label, url }, fileName)}
          onRemove={() => removePage(label)}
        />
      ))}
    </div>
  )

  if (variant === 'inline') {
    return (
      <div>
        {slots}
        {error && <p className="mt-2 text-caption font-medium text-danger">{error}</p>}
      </div>
    )
  }

  return (
    <section
      aria-labelledby={`${errorId}-title`}
      aria-describedby={error ? errorId : undefined}
      className={cn('rounded-kp border bg-surface p-4', error ? 'border-danger/60' : 'border-divider')}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-kp bg-paper text-ink">
          <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={`${errorId}-title`} className="flex flex-wrap items-baseline gap-x-2 text-body font-semibold text-ink">
            {info.label}
            {!required && <span className="text-caption font-normal text-hint">Opcional · {info.requiredFor.toLowerCase()}</span>}
          </h3>
          <p className="text-small text-muted">{info.issuer}</p>
        </div>
      </div>
      <div className="mt-3">{slots}</div>
      {error && (
        <p id={errorId} className="mt-2 text-caption font-medium text-danger">
          {error}
        </p>
      )}
    </section>
  )
}

function PageSlot({
  label,
  page,
  fileName,
  onUploaded,
  onRemove,
}: {
  label: string
  page: DocumentPage | undefined
  fileName: string | undefined
  onUploaded: (url: string, fileName: string) => void
  onRemove: () => void
}) {
  const inputId = useId()
  const upload = useUploadFile()
  const [dragging, setDragging] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const send = (file: File | undefined) => {
    if (!file) return
    setProblem(null)
    upload.mutate(file, {
      onSuccess: (uploaded) => onUploaded(uploaded.url, uploaded.fileName),
      onError: (error) => setProblem(errorMessage(error)),
    })
  }

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragging(false)
    send(event.dataTransfer.files[0])
  }

  const isPdf = page?.url.startsWith('data:application/pdf') || /\.pdf($|\?)/i.test(page?.url ?? '')
  const input = (
    <input
      id={inputId}
      type="file"
      accept={ACCEPT}
      className="sr-only"
      onChange={(event) => {
        send(event.target.files?.[0])
        event.target.value = ''
      }}
    />
  )

  if (page) {
    return (
      <div className="flex items-center gap-3 rounded-kp border border-divider bg-canvas/60 p-2">
        {isPdf ? (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-sm bg-paper text-caption font-semibold text-ink">PDF</span>
        ) : (
          <img src={page.url} alt="" className="size-12 shrink-0 rounded-sm bg-placeholder object-cover" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-small font-semibold text-ink">{label}</span>
          <span className="block truncate text-caption text-muted">{fileName}</span>
        </span>
        {input}
        <label
          htmlFor={inputId}
          title={`Cambiar ${label.toLowerCase()}`}
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-kp text-ink transition-colors duration-150 hover:bg-ink/6 focus-within:outline-2 focus-within:outline-ink"
        >
          {upload.isPending ? <Spinner size={16} /> : <RefreshCw size={15} aria-hidden="true" />}
          <span className="sr-only">Cambiar {label.toLowerCase()}</span>
        </label>
        <IconButton size="sm" tone="danger" label={`Quitar ${label.toLowerCase()}`} icon={<Trash2 size={15} />} onClick={onRemove} />
      </div>
    )
  }

  return (
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
          'flex min-h-16 cursor-pointer items-center justify-center gap-2 rounded-kp border border-dashed px-3 py-3 text-small transition-colors duration-150',
          'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink',
          dragging ? 'border-ink bg-paper text-ink' : 'border-outline text-muted hover:border-ink/50 hover:text-ink',
        )}
      >
        {upload.isPending ? <Spinner size={16} /> : <Upload size={16} aria-hidden="true" />}
        <span>
          <span className="font-semibold text-ink">Subir {label.toLowerCase()}</span> o arrástralo aquí
        </span>
      </label>
      {problem && <p className="mt-1.5 text-caption font-medium text-danger">{problem}</p>}
    </div>
  )
}
