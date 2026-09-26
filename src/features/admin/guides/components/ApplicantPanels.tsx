import { Car, Mail, Phone } from 'lucide-react'
import { Panel, Tag } from '@/components/ui'
import { plural } from '@/lib/format'
import { SERVICE_ROLE_LABELS, type GuideApplication } from '@/data/models'

/** Lo que el guía puso en su perfil: lo que se verifica contra los documentos. */
export function ApplicantProfile({ application }: { application: GuideApplication }) {
  return (
    <Panel title="Perfil en la app" description="Lo que dice de sí; los documentos lo tienen que respaldar.">
      <div className="flex flex-col gap-4">
        <p className="text-body text-ink">{application.bio}</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-body">
          <div>
            <dt className="text-small text-muted">Ofrece</dt>
            <dd className="text-ink">{SERVICE_ROLE_LABELS[application.serviceRole]}</dd>
          </div>
          <div>
            <dt className="text-small text-muted">Experiencia</dt>
            <dd className="text-ink tabular-nums">{plural(application.yearsExperience, 'año', 'años')}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-small text-muted">Idiomas</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {application.languages.map((language) => (
                <Tag key={language}>{language}</Tag>
              ))}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-small text-muted">Especialidades</dt>
            <dd className="text-ink">{application.specialties.join(' · ')}</dd>
          </div>
          <div className="col-span-2">
            <dt className="sr-only">Vehículo</dt>
            <dd className="flex items-center gap-2 text-ink">
              <Car size={16} className="text-muted" aria-hidden="true" />
              {application.hasTransport ? 'Pone su propio vehículo' : 'No pone vehículo'}
            </dd>
          </div>
        </dl>
      </div>
    </Panel>
  )
}

export function ApplicantContact({ application }: { application: GuideApplication }) {
  return (
    <Panel title="Contacto">
      <ul className="flex flex-col gap-3 text-body">
        <li className="flex items-center gap-2.5">
          <Mail size={16} className="text-muted" aria-hidden="true" />
          <a href={`mailto:${application.email}`} className="truncate text-ink underline decoration-outline underline-offset-4 hover:decoration-ink">
            {application.email}
          </a>
        </li>
        <li className="flex items-center gap-2.5 text-ink tabular-nums">
          <Phone size={16} className="text-muted" aria-hidden="true" />
          {application.phone}
        </li>
      </ul>
    </Panel>
  )
}
