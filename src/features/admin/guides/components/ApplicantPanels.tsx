import { Car, Mail, MapPin, Phone } from 'lucide-react'
import { Panel, Tag } from '@/components/ui'
import { LEVEL_LABELS, servicesLabel, type ProviderRequestDetail } from '@/data/models'

/** Lo que la persona dice de sí: los documentos lo tienen que respaldar. */
export function ApplicantProfile({ request }: { request: ProviderRequestDetail }) {
  const { profile } = request
  return (
    <Panel title="Perfil en la app" description="Lo que dice de sí; los documentos lo tienen que respaldar.">
      <div className="flex flex-col gap-4">
        {profile.photoUrl && <img src={profile.photoUrl} alt="" className="size-20 rounded-full bg-placeholder object-cover" />}
        {profile.presentation ? <p className="text-body text-ink">{profile.presentation}</p> : <p className="text-body text-muted">Sin presentación.</p>}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-body">
          <div>
            <dt className="text-small text-muted">Ofrece</dt>
            <dd className="text-ink">{servicesLabel(request.services)}</dd>
          </div>
          <div>
            <dt className="text-small text-muted">Dónde</dt>
            <dd className="flex items-center gap-1.5 text-ink">
              <MapPin size={15} className="text-muted" aria-hidden="true" />
              {request.city?.name ?? 'Todo el país'}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-small text-muted">Idiomas</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {profile.languages.map((language) => (
                <Tag key={language.code}>
                  {language.label} · {LEVEL_LABELS[language.level].toLowerCase()}
                </Tag>
              ))}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="sr-only">Vehículo</dt>
            <dd className="flex items-center gap-2 text-ink">
              <Car size={16} className="text-muted" aria-hidden="true" />
              {profile.carriesTourists ? 'Lleva turistas en su vehículo' : 'No lleva turistas en su vehículo'}
            </dd>
          </div>
        </dl>
      </div>
    </Panel>
  )
}

export function ApplicantContact({ request }: { request: ProviderRequestDetail }) {
  return (
    <Panel title="Contacto">
      <ul className="flex flex-col gap-3 text-body">
        <li className="flex items-center gap-2.5">
          <Mail size={16} className="text-muted" aria-hidden="true" />
          <a href={`mailto:${request.applicant.email}`} className="truncate text-ink underline decoration-outline underline-offset-4 hover:decoration-ink">
            {request.applicant.email}
          </a>
        </li>
        <li className="flex items-center gap-2.5 text-ink tabular-nums">
          <Phone size={16} className="text-muted" aria-hidden="true" />
          {request.profile.phone}
        </li>
      </ul>
    </Panel>
  )
}
