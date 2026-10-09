import { ExternalLink, MonitorSmartphone, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button, ConfirmDialog, Dialog, EmptyState, ErrorState, Field, Input, PageHeader, Pager, Select, SkeletonRows, Tag, Textarea, useToast, type TagTone } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useCreateRelease, useDeleteRelease, usePublishRelease, useReleases, useUpdateRelease, useWithdrawRelease } from '@/data/hooks/use-landing'
import { INSTALLERS, LINK_PATTERN, RELEASE_PLATFORMS, RELEASE_STATUS_LABELS, VERSION_PATTERN, type AppRelease, type ReleasePlatform, type ReleaseStatus } from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatDateTime, plural } from '@/lib/format'

const TONES: Record<ReleaseStatus, TagTone> = { draft: 'neutral', published: 'confirmed', withdrawn: 'danger' }

const VERSION_PROBLEM = 'Usa una versión como 1.2.0, 1.2.0-beta.1 o 1.2.0+14.'
const LINK_PROBLEM = 'Pega el link compartido del instalador; tiene que empezar con https://.'

type Pending = { kind: 'publish' | 'withdraw' | 'delete'; release: AppRelease }

/**
 * Las versiones de la app (`app-release/`, F9), cada una con el link (de Drive) de su instalador.
 * La vigente de cada plataforma es la publicada más reciente, y su link es el que recibe quien
 * pide una demo en la landing. `releases.view` las ve; `releases.manage` las registra, publica y
 * retira.
 */
export function ReleasesPage() {
  useDocumentTitle('Versiones de la app')
  const { can } = useSession()
  const canManage = can('releases.manage')
  const [platform, setPlatform] = useState<ReleasePlatform | ''>('')
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
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

  const confirm = () => {
    if (!pending) return
    const { kind, release } = pending
    const mutation = kind === 'publish' ? publish : kind === 'withdraw' ? withdraw : remove
    const done = { publish: 'Versión publicada', withdraw: 'Versión retirada', delete: 'Borrador borrado' }[kind]
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
        description="Cada versión lleva el link de Drive de su instalador. Regístrala como borrador, prueba el link y publícala: desde ese momento es la que recibe quien pide una demo en la landing."
        actions={
          canManage && (
            <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>
              Nueva versión
            </Button>
          )
        }
      />

      <ul className="grid gap-3 sm:grid-cols-3" aria-label="Lo que hoy se entrega">
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
                  <p className="text-small text-muted">{plural(live.deliveries, 'entrega', 'entregas')}</p>
                </>
              ) : (
                <p className="mt-1 text-small text-muted">Sin versión publicada: quien pida una demo no recibe link de esta plataforma.</p>
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
              <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>
                Registrar la primera
              </Button>
            )
          }
        >
          Sube el APK, el DMG o el EXE a Drive, compártelo con cualquiera que tenga el link y pégalo aquí. Queda como borrador hasta que lo publiques.
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
                      {release.current && <Tag tone="brand">Se entrega con el formulario</Tag>}
                    </div>
                    <p className="mt-1 truncate text-small text-muted">
                      {release.link}
                      {release.status !== 'draft' && ` · ${plural(release.deliveries, 'entrega', 'entregas')}`}
                    </p>
                  </div>
                </div>
                {release.notes && <p className="mt-3 text-body whitespace-pre-line text-ink">{release.notes}</p>}
                <p className="mt-2 text-caption text-muted">
                  La registró {release.createdBy} el {formatDateTime(release.createdAt)}
                  {release.publishedAt && ` · publicada el ${formatDateTime(release.publishedAt)}`}
                  {release.withdrawnAt && ` · retirada el ${formatDateTime(release.withdrawnAt)}`}
                </p>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <a
                    href={release.link}
                    target="_blank"
                    rel="noreferrer"
                    className="mr-auto inline-flex min-h-10 items-center gap-1.5 rounded-kp px-3 text-small font-semibold text-ink hover:bg-paper"
                  >
                    <ExternalLink size={15} aria-hidden="true" />
                    Abrir el link para probar
                  </a>
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

      <CreateDialog open={creating} onClose={() => setCreating(false)} />
      <EditDialog release={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={pending !== null}
        title={pending ? { publish: 'Publicar la versión', withdraw: 'Retirar la versión', delete: 'Borrar el borrador' }[pending.kind] : ''}
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
        Quien pida una demo desde hoy recibe el link de {label}
        {live && live.id !== release.id ? `, en lugar del de la ${live.version}` : ''}. Revisa que el link abra el archivo para cualquiera.
      </p>
    )
  }
  if (pending.kind === 'withdraw') {
    return (
      <p>
        {label} deja de entregarse.{' '}
        {release.current ? 'Vuelve a entregarse la publicada anterior; si no hay otra, quien pida una demo no recibe link de esta plataforma.' : 'No era la vigente: no cambia lo que se entrega.'}
      </p>
    )
  }
  return <p>Se borra la versión {label}. El archivo sigue en Drive. No se puede deshacer.</p>
}

function CreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Nueva versión" description="Queda como borrador: nadie recibe su link hasta que la publiques.">
      {open && <CreateForm onDone={onClose} />}
    </Dialog>
  )
}

function CreateForm({ onDone }: { onDone: () => void }) {
  const [platform, setPlatform] = useState<ReleasePlatform>('android')
  const [version, setVersion] = useState('')
  const [link, setLink] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<{ version?: string; link?: string }>({})
  const create = useCreateRelease()
  const toast = useToast()

  const submit = () => {
    const next = {
      version: VERSION_PATTERN.test(version.trim()) ? undefined : VERSION_PROBLEM,
      link: LINK_PATTERN.test(link.trim()) ? undefined : LINK_PROBLEM,
    }
    setErrors(next)
    if (next.version || next.link) return
    create.mutate(
      { platform, version, notes, link },
      {
        onSuccess: () => {
          toast({ title: 'Versión registrada como borrador' })
          onDone()
        },
        onError: (error) => {
          const fields = (error as { fieldErrors?: Record<string, string> }).fieldErrors ?? {}
          setErrors({ version: fields.version, link: fields.link })
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
          <Select {...control} value={platform} disabled={create.isPending} onChange={(change) => setPlatform(change.target.value as ReleasePlatform)}>
            {RELEASE_PLATFORMS.map((value) => (
              <option key={value} value={value}>
                {INSTALLERS[value].label} ({INSTALLERS[value].format})
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Versión" hint="La que muestra la app, por ejemplo 1.2.0." error={errors.version}>
        {(control) => (
          <Input
            {...control}
            value={version}
            maxLength={32}
            placeholder="1.2.0"
            disabled={create.isPending}
            onChange={(change) => {
              setVersion(change.target.value)
              setErrors((current) => ({ ...current, version: undefined }))
            }}
          />
        )}
      </Field>
      <Field label="Link de Drive" hint={`El link compartido del ${INSTALLERS[platform].format}. En Drive: Compartir → "Cualquier persona con el enlace".`} error={errors.link}>
        {(control) => (
          <Input
            {...control}
            type="url"
            value={link}
            maxLength={500}
            placeholder="https://drive.google.com/file/d/…/view"
            disabled={create.isPending}
            onChange={(change) => {
              setLink(change.target.value)
              setErrors((current) => ({ ...current, link: undefined }))
            }}
          />
        )}
      </Field>
      <Field label="Novedades" optional hint="Lo que cambió en esta versión. Queda para el equipo.">
        {(control) => <Textarea {...control} rows={3} maxLength={4000} value={notes} disabled={create.isPending} onChange={(change) => setNotes(change.target.value)} />}
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone} disabled={create.isPending}>
          Cancelar
        </Button>
        <Button type="submit" icon={<Plus size={16} />} loading={create.isPending}>
          Registrar como borrador
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
  const [link, setLink] = useState(release.link)
  const [notes, setNotes] = useState(release.notes)
  const [errors, setErrors] = useState<{ version?: string; link?: string }>({})
  const update = useUpdateRelease()
  const toast = useToast()
  const isDraft = release.status === 'draft'

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        const next = {
          version: !isDraft || VERSION_PATTERN.test(version.trim()) ? undefined : VERSION_PROBLEM,
          link: LINK_PATTERN.test(link.trim()) ? undefined : LINK_PROBLEM,
        }
        setErrors(next)
        if (next.version || next.link) return
        update.mutate(
          { id: release.id, change: { notes, link, ...(isDraft && { version }) } },
          {
            onSuccess: () => {
              toast({ title: 'Versión actualizada' })
              onDone()
            },
            onError: (caught) => {
              const fields = (caught as { fieldErrors?: Record<string, string> }).fieldErrors ?? {}
              setErrors({ version: fields.version, link: fields.link })
              toast({ title: errorMessage(caught), tone: 'error' })
            },
          },
        )
      }}
    >
      <Field label="Versión" hint={isDraft ? undefined : 'Ya se publicó: la versión no cambia. Si te equivocaste, registra otra.'} error={errors.version}>
        {(control) => (
          <Input
            {...control}
            value={version}
            maxLength={32}
            disabled={!isDraft}
            onChange={(change) => {
              setVersion(change.target.value)
              setErrors((current) => ({ ...current, version: undefined }))
            }}
          />
        )}
      </Field>
      <Field
        label="Link de Drive"
        hint={release.status === 'published' ? 'Si lo cambias, quien pida una demo desde ahora recibe el nuevo.' : undefined}
        error={errors.link}
      >
        {(control) => (
          <Input
            {...control}
            type="url"
            value={link}
            maxLength={500}
            onChange={(change) => {
              setLink(change.target.value)
              setErrors((current) => ({ ...current, link: undefined }))
            }}
          />
        )}
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
