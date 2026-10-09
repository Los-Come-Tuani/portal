import { Flag } from 'lucide-react'
import { useState } from 'react'
import { paths } from '@/app/router/paths'
import { Button, ButtonLink, ConfirmDialog, EmptyState, ErrorState, Field, PageHeader, Pager, Select, SkeletonRows, Tabs, Tag, Textarea, useToast, type TagTone } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useReports, useResolveReport } from '@/data/hooks/use-moderation'
import { REPORT_STATUS_LABELS, REPORT_TARGET_LABELS, type Report, type ReportStatus, type ReportTargetKind } from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatDateTime } from '@/lib/format'
import { SanctionDialog } from './SanctionDialog'

type Section = ReportStatus | 'all'

const TONES: Record<ReportStatus, TagTone> = { pending: 'planned', handled: 'confirmed', dismissed: 'neutral' }

/**
 * La bandeja de reportes (`report/`, F8): lo que cualquiera reportó desde la app o el portal. La
 * resuelven `content.moderate` o `users.manage`; una persona reportada se puede sancionar desde aquí.
 */
export function ReportsPage() {
  useDocumentTitle('Reportes')
  const { can } = useSession()
  const [section, setSection] = useState<Section>('pending')
  const [kind, setKind] = useState<ReportTargetKind | ''>('')
  const [page, setPage] = useState(1)
  const [resolving, setResolving] = useState<{ report: Report; status: 'handled' | 'dismissed' } | null>(null)
  const [sanctioning, setSanctioning] = useState<Report | null>(null)
  const [note, setNote] = useState('')
  const reports = useReports({ status: section === 'all' ? undefined : section, targetKind: kind || undefined, page, pageSize: 20 })
  const resolve = useResolveReport()
  const toast = useToast()

  const closeResolve = () => {
    setResolving(null)
    setNote('')
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reportes"
        description="Lo que alguien reportó de una persona, una reseña, un lugar o un evento. Revísalo, actúa si hace falta (oculta, retira o sanciona) y márcalo resuelto."
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Tabs
          label="Reportes"
          value={section}
          onChange={(value) => {
            setSection(value)
            setPage(1)
          }}
          items={[
            { value: 'pending', label: 'Por revisar', count: section === 'pending' ? reports.data?.elements : undefined },
            { value: 'handled', label: 'Se actuó' },
            { value: 'dismissed', label: 'No procede' },
            { value: 'all', label: 'Todos' },
          ]}
          className="flex-1"
        />
        <Select
          aria-label="Qué se reportó"
          value={kind}
          onChange={(change) => {
            setKind(change.target.value as ReportTargetKind | '')
            setPage(1)
          }}
          className="w-52"
        >
          <option value="">Todo lo reportado</option>
          {(Object.keys(REPORT_TARGET_LABELS) as ReportTargetKind[]).map((value) => (
            <option key={value} value={value}>
              {REPORT_TARGET_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>

      {reports.isPending ? (
        <SkeletonRows rows={4} />
      ) : reports.isError ? (
        <ErrorState error={reports.error} onRetry={() => void reports.refetch()} />
      ) : reports.data.results.length === 0 ? (
        <EmptyState
          icon={<Flag size={20} />}
          title={section === 'pending' ? 'No hay reportes por revisar' : 'No hay reportes aquí'}
          action={
            kind ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setKind('')
                  setPage(1)
                }}
              >
                Ver todo lo reportado
              </Button>
            ) : section !== 'all' ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSection('all')
                  setPage(1)
                }}
              >
                Ver todos los reportes
              </Button>
            ) : can('content.moderate') ? (
              <ButtonLink to={paths.reviewDisputes}>Ver reseñas impugnadas</ButtonLink>
            ) : (
              <ButtonLink to={paths.sanctions}>Ver sanciones</ButtonLink>
            )
          }
        >
          {section === 'pending' && 'Cuando alguien reporte algo, aparece aquí por orden de llegada.'}
        </EmptyState>
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {reports.data.results.map((report) => (
              <li key={report.id} className="rounded-panel border border-divider bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag tone="outline">{REPORT_TARGET_LABELS[report.target.kind]}</Tag>
                      <p className="text-body font-semibold text-ink">{report.target.label || 'Ya no existe'}</p>
                    </div>
                    <p className="mt-1 text-small text-muted">
                      Lo reportó {report.reporter} el {formatDateTime(report.createdAt)}
                    </p>
                  </div>
                  <Tag tone={TONES[report.status]}>{REPORT_STATUS_LABELS[report.status]}</Tag>
                </div>
                <p className="mt-3 text-body text-ink">
                  <span className="font-semibold">{report.reason.label}</span>
                  {report.note && `: ${report.note}`}
                </p>
                {report.status !== 'pending' && (
                  <p className="mt-2 text-small text-muted">
                    Resuelto {report.resolvedAt ? `el ${formatDateTime(report.resolvedAt)}` : ''}
                    {report.resolutionNote ? `: ${report.resolutionNote}` : '.'}
                  </p>
                )}
                {report.status === 'pending' && (
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    {report.target.kind === 'user' && report.target.id && can('users.manage') && (
                      <Button variant="ghost" className="mr-auto" onClick={() => setSanctioning(report)}>
                        Sancionar a {report.target.label}
                      </Button>
                    )}
                    <Button variant="secondary" onClick={() => setResolving({ report, status: 'dismissed' })}>
                      No procede
                    </Button>
                    <Button onClick={() => setResolving({ report, status: 'handled' })}>Ya se actuó</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Pager page={reports.data} onChange={setPage} noun={{ one: 'reporte', many: 'reportes' }} />
        </>
      )}

      <ConfirmDialog
        open={resolving !== null}
        title={resolving?.status === 'handled' ? 'Marcar que se actuó' : 'Marcar que no procede'}
        confirmLabel={resolving?.status === 'handled' ? 'Se actuó' : 'No procede'}
        tone="primary"
        loading={resolve.isPending}
        onClose={closeResolve}
        onConfirm={() =>
          resolving &&
          resolve.mutate(
            { id: resolving.report.id, status: resolving.status, note },
            {
              onSuccess: () => {
                toast({ title: 'Reporte resuelto' })
                closeResolve()
              },
              onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
            },
          )
        }
      >
        <div className="flex flex-col gap-4">
          <p>
            {resolving?.status === 'handled'
              ? 'Ya actuaste: ocultaste la reseña, retiraste el contenido o sancionaste a la persona.'
              : 'Lo revisaste y no hay nada que hacer.'}
          </p>
          <Field label="Nota" optional hint="Para el historial del equipo.">
            {(control) => <Textarea {...control} rows={3} maxLength={1000} value={note} onChange={(change) => setNote(change.target.value)} />}
          </Field>
        </div>
      </ConfirmDialog>
      <SanctionDialog
        user={sanctioning?.target.id ? { id: sanctioning.target.id, name: sanctioning.target.label } : null}
        reportId={sanctioning?.id ?? null}
        onClose={() => setSanctioning(null)}
      />
    </div>
  )
}
