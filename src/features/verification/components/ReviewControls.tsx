import { ChevronDown, UserCheck, UserMinus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Avatar, Button, Dialog, Field, Menu, MenuItem, Textarea, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import type { Reviewer } from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { cn } from '@/lib/cn'

const NOTICE_TONES = {
  neutral: { box: 'border-ink/15 bg-surface', title: 'text-ink' },
  confirmed: { box: 'border-confirmed/30 bg-confirmed/5', title: 'text-confirmed' },
  danger: { box: 'border-danger/25 bg-danger/5', title: 'text-danger' },
}

/** Un aviso sobre el estado de la solicitud: esperando corrección, aprobada o rechazada. */
export function Notice({ tone, title, children }: { tone: keyof typeof NOTICE_TONES; title: string; children?: ReactNode }) {
  return (
    <div role="status" className={cn('rounded-kp border px-5 py-4', NOTICE_TONES[tone].box)}>
      <p className={cn('text-body font-semibold', NOTICE_TONES[tone].title)}>{title}</p>
      {children && <div className="mt-1 max-w-[76ch] text-body text-ink">{children}</div>}
    </div>
  )
}

interface AssigneeMenuProps {
  assigneeId: string | null
  reviewers: readonly Reviewer[]
  /** Ya se decidió: sólo se muestra quién llevó el caso. */
  closed: boolean
  onAssign: (assigneeId: string | null) => Promise<unknown>
  assigning: boolean
}

/** Quién lleva la solicitud: tomarla, pasarla a otra persona o soltarla. */
export function AssigneeMenu({ assigneeId, reviewers, closed, onAssign, assigning }: AssigneeMenuProps) {
  const { user } = useSession()
  const toast = useToast()
  const assignee = reviewers.find((reviewer) => reviewer.id === assigneeId)

  const assign = async (next: string | null) => {
    try {
      await onAssign(next)
      toast({
        title:
          next === null
            ? 'La solicitud quedó sin responsable'
            : next === user.id
              ? 'Tomaste la solicitud'
              : `Asignada a ${reviewers.find((reviewer) => reviewer.id === next)?.name}`,
      })
    } catch (error) {
      toast({ title: errorMessage(error), tone: 'error' })
    }
  }

  if (closed) {
    return assignee ? (
      <span className="inline-flex items-center gap-2 text-small text-muted">
        <Avatar name={assignee.name} size="sm" />
        Llevó el caso: <span className="font-medium text-ink">{assignee.name}</span>
      </span>
    ) : null
  }

  if (!assignee) {
    return (
      <Button variant="secondary" icon={<UserCheck size={16} />} loading={assigning} onClick={() => void assign(user.id)}>
        Tomar solicitud
      </Button>
    )
  }

  return (
    <Menu
      trigger={(props) => (
        <button
          type="button"
          {...props}
          className="inline-flex h-10 items-center gap-2 rounded-kp px-2.5 text-small text-muted transition-colors duration-150 hover:bg-ink/6"
        >
          <Avatar name={assignee.name} size="sm" />
          <span>
            Responsable: <span className="font-semibold text-ink">{assignee.id === user.id ? 'tú' : assignee.name}</span>
          </span>
          <ChevronDown size={15} aria-hidden="true" />
        </button>
      )}
    >
      {(close) => (
        <>
          <p className="px-2.5 pt-1.5 pb-1 text-caption text-muted">Asignar a</p>
          {reviewers
            .filter((reviewer) => reviewer.id !== assignee.id)
            .map((reviewer) => (
              <MenuItem
                key={reviewer.id}
                icon={<Avatar name={reviewer.name} size="xs" />}
                onSelect={() => {
                  close()
                  void assign(reviewer.id)
                }}
              >
                {reviewer.id === user.id ? 'Tomarla yo' : reviewer.name}
                {reviewer.canDecide && reviewers.some((item) => !item.canDecide) && (
                  <span className="ml-auto text-caption text-muted">decide</span>
                )}
              </MenuItem>
            ))}
          <MenuItem
            icon={<UserMinus size={16} />}
            onSelect={() => {
              close()
              void assign(null)
            }}
          >
            Dejar sin responsable
          </MenuItem>
        </>
      )}
    </Menu>
  )
}

interface RequestChangesDialogProps {
  open: boolean
  /** Lo que ya se anotó al rechazar documentos, como punto de partida. */
  suggested: string
  /** "El guía lo lee tal cual en la app." */
  readerHint: string
  description: string
  onSubmit: (note: string) => Promise<unknown>
  submitting: boolean
  onClose: () => void
  successToast: string
}

export function RequestChangesDialog({
  open,
  suggested,
  readerHint,
  description,
  onSubmit,
  submitting,
  onClose,
  successToast,
}: RequestChangesDialogProps) {
  const toast = useToast()
  const [state, setState] = useState({ open, note: suggested, error: '' })
  if (state.open !== open) setState({ open, note: suggested, error: '' })

  const submit = async () => {
    if (state.note.trim().length < 10) {
      setState((current) => ({ ...current, error: 'Explica qué tiene que corregir' }))
      return
    }
    try {
      await onSubmit(state.note.trim())
      toast({ title: 'Corrección pedida', description: successToast })
      onClose()
    } catch (error) {
      toast({ title: errorMessage(error), tone: 'error' })
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Pedir una corrección"
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} loading={submitting}>
            Pedir corrección
          </Button>
        </>
      }
    >
      <Field label="Qué tiene que corregir" hint={`${readerHint} Sé concreto.`} error={state.error || undefined}>
        {(control) => (
          <Textarea
            {...control}
            data-autofocus
            rows={4}
            value={state.note}
            onChange={(event) => setState((current) => ({ ...current, note: event.target.value, error: '' }))}
          />
        )}
      </Field>
    </Dialog>
  )
}
