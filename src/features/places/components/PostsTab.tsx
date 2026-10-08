import { zodResolver } from '@hookform/resolvers/zod'
import { ImageIcon, ImagePlus, Megaphone, Pencil, Plus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import {
  Button,
  ConfirmDialog,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Input,
  SkeletonRows,
  Switch,
  Tag,
  Textarea,
  useToast,
} from '@/components/ui'
import { ApiError, errorMessage } from '@/data/api/errors'
import { uploadFile } from '@/data/api/upload'
import { useDeletePost, usePosts, useSavePost } from '@/data/hooks/use-places'
import type { Photo, Post, PostInput } from '@/data/models'
import { postInputSchema } from '@/data/schemas/profile.schema'
import { formatDateTime } from '@/lib/format'

export function PostsTab({ stopId }: { stopId: string }) {
  const posts = usePosts(stopId)
  const remove = useDeletePost()
  const toast = useToast()
  const [editing, setEditing] = useState<Post | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Post | null>(null)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lead font-semibold text-ink">Novedades</h3>
          <p className="mt-0.5 max-w-[60ch] text-small text-muted">
            Publicaciones cortas con foto: un menú de temporada, un aviso, algo que pasa esta semana.
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setEditing('new')}>
          Nueva novedad
        </Button>
      </div>

      {posts.isPending ? (
        <SkeletonRows rows={3} />
      ) : posts.isError ? (
        <ErrorState error={posts.error} onRetry={() => void posts.refetch()} />
      ) : posts.data.length === 0 ? (
        <EmptyState icon={<Megaphone size={20} />} title="Todavía no publicas novedades" className="rounded-kp border border-dashed border-outline">
          Cuéntales a los turistas qué hay de nuevo: aparece en la ficha de tu lugar.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-divider rounded-kp border border-divider bg-surface">
          {posts.data.map((post) => (
            <li key={post.id} className="flex items-start gap-4 p-4">
              {post.image?.url ? (
                <img src={post.image.url} alt="" loading="lazy" className="size-16 shrink-0 rounded-sm bg-placeholder object-cover" />
              ) : (
                <span className="flex size-16 shrink-0 items-center justify-center rounded-sm bg-paper text-muted">
                  <ImageIcon size={18} aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-body font-semibold text-ink">{post.title}</p>
                  {post.status === 'hidden' && <Tag tone="neutral">Oculta</Tag>}
                </div>
                <p className="mt-0.5 line-clamp-2 text-small text-muted">{post.body}</p>
                <p className="mt-1 text-caption text-hint">{formatDateTime(post.publishedAt)}</p>
              </div>
              <div className="flex shrink-0">
                <IconButton label="Editar novedad" icon={<Pencil size={16} />} onClick={() => setEditing(post)} />
                <IconButton
                  label="Borrar novedad"
                  icon={<Trash2 size={16} />}
                  onClick={() => setDeleting(post)}
                  tone="danger"
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <PostDialog
        open={editing !== null}
        post={editing === 'new' ? null : editing}
        stopId={stopId}
        onClose={() => setEditing(null)}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="¿Borrar esta novedad?"
        confirmLabel="Borrar"
        loading={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              setDeleting(null)
              toast({ title: 'Novedad borrada' })
            },
            onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
          })
        }
      >
        "{deleting?.title}" deja de verse en la app. No se puede deshacer.
      </ConfirmDialog>
    </div>
  )
}

function PostDialog({ open, post, stopId, onClose }: { open: boolean; post: Post | null; stopId: string; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} variant="sheet" title={post ? 'Editar novedad' : 'Nueva novedad'}>
      <PostForm key={post?.id ?? 'new'} post={post} stopId={stopId} onDone={onClose} />
    </Dialog>
  )
}

function PostForm({ post, stopId, onDone }: { post: Post | null; stopId: string; onDone: () => void }) {
  const save = useSavePost()
  const toast = useToast()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<PostInput>({
    resolver: zodResolver(postInputSchema),
    defaultValues: post
      ? { stopId: post.stopId, title: post.title, body: post.body, image: post.image, status: post.status }
      : { stopId, title: '', body: '', image: null, status: 'published' },
  })
  const body = useWatch({ control, name: 'body' }) ?? ''

  const submit = handleSubmit((input) =>
    save.mutate(
      { id: post?.id, input },
      {
        onSuccess: () => {
          toast({ title: post ? 'Novedad actualizada' : 'Novedad publicada' })
          onDone()
        },
        onError: (error) => {
          if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
            Object.entries(error.fieldErrors).forEach(([field, message]) => setError(field as keyof PostInput, { message }))
          }
          toast({ title: errorMessage(error), tone: 'error' })
        },
      },
    ),
  )

  return (
    <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
      <Field label="Título" error={errors.title?.message}>
        {(field) => <Input {...field} placeholder="Sopa de queso todos los viernes" {...register('title')} />}
      </Field>
      <Field label="Texto" error={errors.body?.message} hint={`${body.length} de 500 letras`}>
        {(field) => <Textarea {...field} rows={5} maxLength={500} {...register('body')} />}
      </Field>
      <Controller
        control={control}
        name="image"
        render={({ field, fieldState }) => <PostPhotoField value={field.value} onChange={field.onChange} error={fieldState.error?.message} />}
      />
      <Controller
        control={control}
        name="status"
        render={({ field }) => (
          <Switch
            label="Publicada"
            description="Si la apagas, deja de verse en la app pero no se borra."
            checked={field.value === 'published'}
            onChange={(checked) => field.onChange(checked ? 'published' : 'hidden')}
          />
        )}
      />
      <div className="flex justify-end gap-2 border-t border-divider pt-5">
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.isPending}>
          {post ? 'Guardar' : 'Publicar'}
        </Button>
      </div>
    </form>
  )
}

/** Una sola foto: se sube al elegirla y viaja por su clave; si la subida falla, el formulario sigue. */
function PostPhotoField({ value, onChange, error }: { value: Photo | null; onChange: (value: Photo | null) => void; error?: string }) {
  const input = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const pick = async (files: FileList | null) => {
    const file = files?.[0]
    if (input.current) input.current.value = ''
    if (!file) return
    setProblem(null)
    setUploading(true)
    try {
      const stored = await uploadFile('place-photo', file)
      onChange({ key: stored.key, url: URL.createObjectURL(file) })
    } catch (failure) {
      setProblem(errorMessage(failure))
    } finally {
      setUploading(false)
    }
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-small font-medium text-ink">
        Foto <span className="font-normal text-muted">(opcional)</span>
      </legend>
      {value &&
        (value.url ? (
          <img src={value.url} alt="" className="aspect-[3/2] w-full rounded-kp bg-placeholder object-cover" />
        ) : (
          <span className="flex aspect-[3/2] w-full items-center justify-center rounded-kp bg-paper text-small text-muted">Sin vista previa</span>
        ))}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Elegir la foto de la novedad"
        onChange={(event) => void pick(event.target.files)}
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" icon={<ImagePlus size={15} />} loading={uploading} onClick={() => input.current?.click()}>
          {value ? 'Cambiar foto' : 'Agregar foto'}
        </Button>
        {value && (
          <Button variant="ghost" size="sm" icon={<Trash2 size={15} />} onClick={() => onChange(null)}>
            Quitar foto
          </Button>
        )}
      </div>
      {(problem || error) && (
        <p role="alert" className="text-caption font-medium text-danger">
          {problem ?? error}
        </p>
      )}
    </fieldset>
  )
}
