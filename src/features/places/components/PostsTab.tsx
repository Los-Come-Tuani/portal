import { zodResolver } from '@hookform/resolvers/zod'
import { ImageIcon, Megaphone, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
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
import { errorMessage } from '@/data/api/errors'
import { useDeletePost, usePosts, useSavePost } from '@/data/hooks/use-places'
import type { Post, PostInput } from '@/data/models'
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
              {post.image ? (
                <img src={post.image} alt="" loading="lazy" className="size-16 shrink-0 rounded-sm bg-placeholder object-cover" />
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
                  className="text-danger hover:bg-danger/8"
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
    formState: { errors },
  } = useForm<PostInput>({
    resolver: zodResolver(postInputSchema),
    defaultValues: post
      ? { stopId: post.stopId, title: post.title, body: post.body, image: post.image, status: post.status }
      : { stopId, title: '', body: '', image: '', status: 'published' },
  })
  const body = useWatch({ control, name: 'body' }) ?? ''
  const image = useWatch({ control, name: 'image' })

  const submit = handleSubmit((input) =>
    save.mutate(
      { id: post?.id, input },
      {
        onSuccess: () => {
          toast({ title: post ? 'Novedad actualizada' : 'Novedad publicada' })
          onDone()
        },
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
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
      <Field label="Foto" optional error={errors.image?.message} hint="Dirección web de la imagen (https://…).">
        {(field) => <Input {...field} type="url" placeholder="https://" {...register('image')} />}
      </Field>
      {image && !errors.image && (
        <img src={image} alt="" className="aspect-[3/2] w-full rounded-kp bg-placeholder object-cover" />
      )}
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
