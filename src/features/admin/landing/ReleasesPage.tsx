import { Download, MonitorSmartphone, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { useId, useState } from 'react'
import { Button, ConfirmDialog, Dialog, EmptyState, ErrorState, Field, Input, PageHeader, Pager, Select, SkeletonRows, Tag, Textarea, useToast, type TagTone } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { installerProblem } from '@/data/api/upload'
import { useCreateRelease, useDeleteRelease, usePublishRelease, useReleases, useUpdateRelease, useWithdrawRelease } from '@/data/hooks/use-landing'
import { landingRepository } from '@/data/repositories/landing.repository'
import { INSTALLERS, RELEASE_PLATFORMS, RELEASE_STATUS_LABELS, VERSION_PATTERN, type AppRelease, type ReleasePlatform, type ReleaseStatus } from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { cn } from '@/lib/cn'
import { formatDateTime, formatNumber, plural } from '@/lib/format'

const TONES: Record<ReleaseStatus, TagTone> = { draft: 'neutral', published: 'confirmed', withdrawn: 'danger' }

const megabytes = (bytes: number) => `${(bytes / (1024 * 1024)).toLocaleString('es-NI', { maximumFractionDigits: 1 })} MB`

type Pending = { kind: 'publish' | 'withdraw' | 'delete'; release: AppRelease }

/**
 * Las versiones de la app que se descargan desde la landing (`app-release/`, F9). La vigente de
 * cada plataforma es la publicada más reciente: publicar otra la reemplaza y retirarla deja otra
 * vez la anterior. `releases.view` las ve y prueba; `releases.manage` sube, publica y retira.
 */
export function ReleasesPage() {
  useDocumentTitle('Versiones de la app')
  const { can } = useSession()
  const canManage = can('releases.manage')
  const [platform, setPlatform] = useState<ReleasePlatform | ''>('')
  const [page, setPage] = useState(1)
  const [uploading, setUploading] = useState(false)
  const [editing, setEditing] = useState<AppRelease | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const releases = useReleases({ platform: platform || undefined, page, pageSize: 20 })
  // Las vigentes no dependen del filtro: se piden aparte.
  const published = useReleases({ status: 'published', pageSize: 100 })
  const publish = usePublishRelease()
  const withdraw = useWithdrawRelease()
  const remove = useDeleteRelease()
  const toast = useToast()

  const current = (target: ReleasePlatform) => published.data?.results.find((release) => release.platform === target && release.current)

  const download = async (release: AppRelease) => {
    try {
      window.location.assign(await landingRepository.downloadUrl(release.id))
    } catch (error) {
      toast({ title: errorMessage(error), tone: 'error' })
    }
  }

  const confirm = () => {
    if (!pending) return
    const { kind, release } = pending
    const mutation = kind === 'publish' ? publish : kind === 'withdraw' ? withdraw : remove
    const done = { publish: 'Versión publicada en la landing', withdraw: 'Versión retirada', delete: 'Borrador borrado' }[kind]
    mutation.mutate(release.id, {
      onSuccess: () => {
        toast({ title: done })
        setPending(null)
      },
      onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Versiones de la app"
        description="Los instaladores que se descargan desde la landing. Sube uno como borrador, pruébalo y publícalo: reemplaza al vigente de su plataforma."
        actions={
          canManage && (
            <Button icon={<Plus size={16} />} onClick={() => setUploading(true)}>
              Subir versión
            </Button>
          )
        }
      />

      <ul className="grid gap-3 sm:grid-cols-3" aria-label="Lo que hoy se descarga">
        {RELEASE_PLATFORMS.map((target) => {
          const live = current(target)
          return (
            <li key={target} className="rounded-panel border border-divider bg-surface p-4">
              <p className="text-caption font-semibold text-muted">
                {INSTALLERS[target].label} · {INSTALLERS[target].format}
              </p>
              {published.isPending ? (
                <p className="mt-1 text-small text-muted">Cargando…</p>
              ) : live ? (
                <>
                  <p className="mt-1 text-title font-semibold text-ink">{live.version}</p>
                  <p className="text-small text-muted">{plural(live.downloads, 'descarga', 'descargas')}</p>
                </>
              ) : (
                <p className="mt-1 text-small text-muted">Sin versión publicada: la landing no muestra este botón.</p>
              )}
            </li>
          )
        })}
      </ul>

      <div className="flex justify-end">
        <Select
          aria-label="Plataforma"
          value={platform}
          onChange={(change) => {
            setPlatform(change.target.value as ReleasePlatform | '')
            setPage(1)
          }}
          className="w-52"
        >
          <option value="">Todas las plataformas</option>
          {RELEASE_PLATFORMS.map((value) => (
            <option key={value} value={value}>
              {INSTALLERS[value].label}
            </option>
          ))}
        </Select>
      </div>

      {releases.isPending ? (
        <SkeletonRows rows={4} />
      ) : releases.isError ? (
        <ErrorState error={releases.error} onRetry={() => void releases.refetch()} />
      ) : releases.data.results.length === 0 ? (
        <EmptyState
          icon={<MonitorSmartphone size={20} />}
          title="Todavía no hay versiones"
          action={
            canManage && (
              <Button icon={<Upload size={16} />} onClick={() => setUploading(true)}>
                Subir la primera
              </Button>
            )
          }
        >
          Sube el APK, el DMG o el EXE de la app. Queda como borrador hasta que lo publiques.
        </EmptyState>
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {releases.data.results.map((release) => (
              <li key={release.id} className="rounded-panel border border-divider bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-body font-semibold text-ink">
                        {INSTALLERS[release.platform].label} {release.version}
                      </p>
                      <Tag tone={TONES[release.status]}>{RELEASE_STATUS_LABELS[release.status]}</Tag>
                      {release.current && <Tag tone="brand">Se descarga en la landing</Tag>}
                    </div>
                    <p className="mt-1 text-small text-muted">
                      {release.fileName} · {megabytes(release.size)}
                      {release.status !== 'draft' && ` · ${plural(release.downloads, 'descarga', 'descargas')}`}
                    </p>
                  </div>
                </div>
                {release.notes && <p className="mt-3 text-body whitespace-pre-line text-ink">{release.notes}</p>}
                <p className="mt-2 text-caption text-muted">
                  La subió {release.createdBy} el {formatDateTime(release.createdAt)}
                  {release.publishedAt && ` · publicada el ${formatDateTime(release.publishedAt)}`}
                  {release.withdrawnAt && ` · retirada el ${formatDateTime(release.withdrawnAt)}`}
                </p>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <Button variant="ghost" icon={<Download size={15} />} className="mr-auto" onClick={() => void download(release)}>
                    Descargar para probar
                  </Button>
                  {canManage && (
                    <>
                      <Button variant="ghost" icon={<Pencil size={15} />} onClick={() => setEditing(release)}>
                        Editar
                      </Button>
                      {release.status === 'draft' && (
                        <Button variant="ghost" icon={<Trash2 size={15} />} onClick={() => setPending({ kind: 'delete', release })}>
                          Borrar
                        </Button>
                      )}
                      {release.status === 'published' ? (
                        <Button variant="secondary" onClick={() => setPending({ kind: 'withdraw', release })}>
                          Retirar
                        </Button>
                      ) : (
                        <Button onClick={() => setPending({ kind: 'publish', release })}>{release.status === 'withdrawn' ? 'Publicar de nuevo' : 'Publicar'}</Button>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Pager page={releases.data} onChange={setPage} noun={{ one: 'versión', many: 'versiones' }} />
        </>
      )}

      <UploadDialog open={uploading} onClose={() => setUploading(false)} />
      <EditDialog release={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={pending !== null}
        title={pending ? { publish: 'Publicar en la landing', withdraw: 'Retirar la versión', delete: 'Borrar el borrador' }[pending.kind] : ''}
        confirmLabel={pending ? { publish: 'Publicar', withdraw: 'Retirar', delete: 'Borrar' }[pending.kind] : ''}
        tone={pending?.kind === 'publish' ? 'primary' : 'danger'}
        loading={publish.isPending || withdraw.isPending || remove.isPending}
        onClose={() => setPending(null)}
        onConfirm={confirm}
      >
        {pending && <ConfirmText pending={pending} live={current(pending.release.platform)} />}
      </ConfirmDialog>
    </div>
  )
}

function ConfirmText({ pending, live }: { pending: Pending; live: AppRelease | undefined }) {
  const { release } = pending
  const label = `${INSTALLERS[release.platform].label} ${release.version}`
  if (pending.kind === 'publish') {
    return (
      <p>
        {label} pasa a ser la descarga de la landing
        {live && live.id !== release.id ? `, en lugar de la ${live.version}` : ''}. Quien la baje desde hoy instala esta.
      </p>
    )
  }
  if (pending.kind === 'withdraw') {
    return (
      <p>
        {label} deja de descargarse.{' '}
        {release.current ? 'La landing vuelve a ofrecer la publicada anterior; si no hay otra, oculta el botón de esta plataforma.' : 'No era la vigente: la landing no cambia.'}
      </p>
    )
  }
  return <p>Se borran la versión {label} y su instalador. No se puede deshacer.</p>
}

function UploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Subir versión" description="Queda como borrador: la landing no la ofrece hasta que la publiques.">
      {open && <UploadForm onDone={onClose} />}
    </Dialog>
  )
}

function UploadForm({ onDone }: { onDone: () => void }) {
  const inputId = useId()
  const errorId = useId()
  const [platform, setPlatform] = useState<ReleasePlatform>('android')
  const [version, setVersion] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [errors, setErrors] = useState<{ version?: string; file?: string }>({})
  const create = useCreateRelease()
  const toast = useToast()
  const installer = INSTALLERS[platform]

  const submit = () => {
    const next = {
      version: VERSION_PATTERN.test(version.trim()) ? undefined : 'Usa una versión como 1.2.0, 1.2.0-beta.1 o 1.2.0+14.',
      file: file ? (installerProblem(platform, file) ?? undefined) : `Elige el ${installer.format}.`,
    }
    setErrors(next)
    if (next.version || next.file || !file) return
    setProgress(0)
    create.mutate(
      { input: { platform, version, notes, file }, onProgress: setProgress },
      {
        onSuccess: () => {
          toast({ title: 'Versión subida como borrador' })
          onDone()
        },
        onError: (error) => {
          const fields = (error as { fieldErrors?: Record<string, string> }).fieldErrors ?? {}
          setErrors({ version: fields.version, file: fields.file })
          toast({ title: errorMessage(error), tone: 'error' })
        },
      },
    )
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <Field label="Plataforma">
        {(control) => (
          <Select
            {...control}
            value={platform}
            disabled={create.isPending}
            onChange={(change) => {
              setPlatform(change.target.value as ReleasePlatform)
              setFile(null)
              setErrors({})
            }}
          >
            {RELEASE_PLATFORMS.map((value) => (
              <option key={value} value={value}>
                {INSTALLERS[value].label} ({INSTALLERS[value].format})
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Versión" hint="La que muestra la app, por ejemplo 1.2.0. Va en el nombre del archivo que se descarga." error={errors.version}>
        {(control) => <Input {...control} value={version} maxLength={32} placeholder="1.2.0" disabled={create.isPending} onChange={(change) => setVersion(change.target.value)} />}
      </Field>
      <Field label="Novedades" optional hint="Lo que cambió. La landing lo muestra junto al botón de descarga.">
        {(control) => <Textarea {...control} rows={3} maxLength={4000} value={notes} disabled={create.isPending} onChange={(change) => setNotes(change.target.value)} />}
      </Field>
      <div className="flex flex-col gap-2">
        <span className="text-small font-medium text-ink">Instalador ({installer.format}, hasta 500 MB)</span>
        <input
          id={inputId}
          type="file"
          accept={`${installer.extension},${installer.contentType}`}
          disabled={create.isPending}
          aria-invalid={!!errors.file}
          aria-describedby={errors.file ? errorId : undefined}
          className="peer sr-only"
          onChange={(change) => {
            setFile(change.target.files?.[0] ?? null)
            setErrors((current) => ({ ...current, file: undefined }))
          }}
        />
        <label
          htmlFor={inputId}
          className={cn(
            'flex min-h-14 cursor-pointer items-center gap-2 rounded-kp border border-dashed px-3 py-3 text-small transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink',
            errors.file ? 'border-danger/60 text-muted' : 'border-outline text-muted hover:border-ink/50 hover:text-ink',
            create.isPending && 'pointer-events-none opacity-60',
          )}
        >
          <Upload size={16} aria-hidden="true" className="shrink-0" />
          {file ? (
            <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
              <span className="truncate font-semibold text-ink">{file.name}</span>
              <span className="shrink-0">{megabytes(file.size)}</span>
            </span>
          ) : (
            <span>
              <span className="font-semibold text-ink">Elige el {installer.format}</span> de esta versión
            </span>
          )}
        </label>
        {errors.file && (
          <p id={errorId} className="text-caption font-medium text-danger">
            {errors.file}
          </p>
        )}
      </div>
      {create.isPending && (
        <div className="flex flex-col gap-1" role="status">
          <div className="h-2 overflow-hidden rounded-full bg-paper">
            <div className="h-full rounded-full bg-brand transition-[width] duration-200" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="text-caption text-muted">{progress < 1 ? `Subiendo… ${formatNumber(Math.round(progress * 100))} %` : 'Registrando la versión…'}</p>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone} disabled={create.isPending}>
          Cancelar
        </Button>
        <Button type="submit" icon={<Upload size={16} />} loading={create.isPending}>
          Subir como borrador
        </Button>
      </div>
    </form>
  )
}

function EditDialog({ release, onClose }: { release: AppRelease | null; onClose: () => void }) {
  return (
    <Dialog open={release !== null} onClose={onClose} title="Editar la versión" description={release ? `${INSTALLERS[release.platform].label} ${release.version}` : undefined}>
      {release && <EditForm key={release.id} release={release} onDone={onClose} />}
    </Dialog>
  )
}

function EditForm({ release, onDone }: { release: AppRelease; onDone: () => void }) {
  const [version, setVersion] = useState(release.version)
  const [notes, setNotes] = useState(release.notes)
  const [error, setError] = useState<string | undefined>()
  const update = useUpdateRelease()
  const toast = useToast()
  const isDraft = release.status === 'draft'

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (isDraft && !VERSION_PATTERN.test(version.trim())) {
          setError('Usa una versión como 1.2.0, 1.2.0-beta.1 o 1.2.0+14.')
          return
        }
        update.mutate(
          { id: release.id, change: { notes, ...(isDraft && { version }) } },
          {
            onSuccess: () => {
              toast({ title: 'Versión actualizada' })
              onDone()
            },
            onError: (caught) => {
              setError((caught as { fieldErrors?: Record<string, string> }).fieldErrors?.version)
              toast({ title: errorMessage(caught), tone: 'error' })
            },
          },
        )
      }}
    >
      <Field label="Versión" hint={isDraft ? undefined : 'Ya se publicó: la versión no cambia. Si te equivocaste, sube otra.'} error={error}>
        {(control) => <Input {...control} value={version} maxLength={32} disabled={!isDraft} onChange={(change) => setVersion(change.target.value)} />}
      </Field>
      <Field label="Novedades" optional>
        {(control) => <Textarea {...control} rows={4} maxLength={4000} value={notes} onChange={(change) => setNotes(change.target.value)} />}
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone} disabled={update.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={update.isPending}>
          Guardar
        </Button>
      </div>
    </form>
  )
}
