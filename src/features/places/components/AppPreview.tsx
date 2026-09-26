import {
  ArrowLeft,
  AtSign,
  Clock,
  EllipsisVertical,
  Globe,
  Lightbulb,
  ListPlus,
  MapPin,
  Medal,
  MessageCircle,
  Phone,
  QrCode,
  Star,
  StarHalf,
  Store,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { AMENITIES, type PlaceProfileInput, type Post, type StopInput } from '@/data/models'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'

interface AppPreviewProps {
  stop: StopInput
  profile: PlaceProfileInput | undefined
  hasBadge: boolean
  rating: number
  reviewsCount: number
  latestPost?: Post
}

/** Mismo criterio que CategoryChip.colorOf de la app. */
function chipColor(category: string): string {
  switch (category.toLowerCase()) {
    case 'cultura':
      return 'bg-chip-culture'
    case 'naturaleza':
      return 'bg-chip-nature'
    case 'ciudad':
      return 'bg-chip-city'
    default:
      return 'bg-brand'
  }
}

function Stars({ rating, reviewsCount }: { rating: number; reviewsCount: number }) {
  return (
    <div className="mt-1.5 flex items-center gap-0.5 text-star">
      {[1, 2, 3, 4, 5].map((index) =>
        rating - index >= 0 ? (
          <Star key={index} size={13} fill="currentColor" strokeWidth={0} />
        ) : rating - index >= -0.5 ? (
          <StarHalf key={index} size={13} fill="currentColor" strokeWidth={0} />
        ) : (
          <Star key={index} size={13} strokeWidth={1.5} />
        ),
      )}
      <span className="ml-1.5 text-[11px] font-semibold text-ink">{rating.toFixed(1)}</span>
      <span className="text-[10px] text-muted">({reviewsCount} reseñas)</span>
    </div>
  )
}

function IconRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-ink">
      <span className="mt-px shrink-0 text-brand">{icon}</span>
      {children}
    </p>
  )
}

/** La ficha tal como la dibuja la app (stop_detail_view.dart), dentro de un teléfono. */
export function AppPreview({ stop, profile, hasBadge, rating, reviewsCount, latestPost }: AppPreviewProps) {
  const cover = stop.images?.[0]
  const amenities = AMENITIES.filter((amenity) => profile?.amenities.includes(amenity.id))
  const contact = profile?.contact
  const hasUpcoming =
    !!profile &&
    (profile.offerings.length > 0 ||
      amenities.length > 0 ||
      !!(contact?.phone || contact?.whatsapp || contact?.instagram || contact?.website) ||
      !!latestPost)

  return (
    <figure className="flex flex-col items-center">
      <div className="w-[19.5rem] rounded-[2.6rem] bg-ink p-2.5 shadow-pop">
        <div className="relative h-[40rem] overflow-y-auto rounded-[2.1rem] bg-canvas [scrollbar-width:none]">
          <div className="relative h-44 bg-placeholder">
            {cover && <img src={cover} alt="" className="size-full object-cover" />}
            <div className="absolute inset-x-3 top-3 flex justify-between">
              {[<ArrowLeft key="back" size={15} />, <EllipsisVertical key="more" size={15} />].map((icon) => (
                <span key={icon.key} className="flex size-8 items-center justify-center rounded-full bg-surface text-ink shadow-raise">
                  {icon}
                </span>
              ))}
            </div>
            <span
              className={cn(
                'absolute bottom-3 left-3 rounded-sm px-2 py-0.5 text-[10px] font-semibold text-white',
                chipColor(stop.category ?? ''),
              )}
            >
              {stop.category}
            </span>
            <span className="absolute right-3 bottom-3 flex size-9 items-center justify-center rounded-full bg-surface text-brand shadow-raise">
              <MapPin size={16} fill="currentColor" className="text-brand" stroke="white" />
            </span>
          </div>

          <div className="px-4 pt-4 pb-6">
            <p className="text-heading leading-tight font-bold text-ink">{stop.name || 'Nombre del lugar'}</p>
            <Stars rating={rating} reviewsCount={reviewsCount} />
            <div className="mt-2">
              <IconRow icon={<MapPin size={12} />}>{stop.address || 'Dirección'}</IconRow>
              <IconRow icon={<Clock size={12} />}>{stop.duration || '—'}</IconRow>
              {stop.opensAt && stop.closesAt && (
                <IconRow icon={<Store size={12} />}>
                  Abierto de {stop.opensAt} – {stop.closesAt}
                </IconRow>
              )}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted">{stop.description}</p>

            {stop.tip && (
              <div className="mt-3 flex gap-2 rounded-kp border border-divider bg-surface p-2.5">
                <Lightbulb size={13} className="mt-0.5 shrink-0 text-brand" />
                <div>
                  <p className="text-[11px] font-bold text-brand">Recomendaciones</p>
                  <p className="text-[10px] leading-snug text-muted">{stop.tip}</p>
                </div>
              </div>
            )}

            {hasBadge && (
              <div className="mt-3 rounded-kp bg-brand/8 p-2.5">
                <p className="flex items-center gap-2 text-[11px] text-ink">
                  <Medal size={15} className="shrink-0 text-brand" />
                  Esta parada otorga una insignia de {stop.category}
                </p>
                <p className="mt-2 flex h-8 items-center justify-center gap-1.5 rounded-kp border border-brand text-[10px] font-semibold text-brand">
                  <QrCode size={12} />
                  Escanear código QR
                </p>
              </div>
            )}

            <p className="mt-4 flex h-10 items-center justify-center gap-2 rounded-kp bg-brand text-[11px] font-semibold tracking-label text-on-brand uppercase">
              <ListPlus size={14} />
              Añadir a un circuito
            </p>

            {hasUpcoming && (
              <div className="mt-5 rounded-kp border border-dashed border-ink/25 p-3">
                {profile.offerings.length > 0 && (
                  <div>
                    <p className="text-[12px] font-semibold text-ink">Qué ofrecemos</p>
                    <ul className="mt-1.5 flex flex-col gap-1">
                      {profile.offerings.slice(0, 5).map((offering) => (
                        <li key={offering.id} className="flex items-baseline justify-between gap-2 text-[10px]">
                          <span className="truncate text-ink">{offering.name || 'Sin nombre'}</span>
                          <span className="shrink-0 font-semibold text-ink tabular-nums">
                            {offering.price === null ? 'A consultar' : formatMoney(offering.price)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {amenities.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {amenities.map((amenity) => (
                      <span key={amenity.id} className="rounded-sm border border-divider bg-surface px-1.5 py-0.5 text-[9px] text-muted">
                        {amenity.label}
                      </span>
                    ))}
                  </div>
                )}
                {profile.languages.length > 0 && (
                  <p className="mt-2 text-[10px] text-muted">Atienden en {profile.languages.join(', ').toLowerCase()}</p>
                )}
                {contact && (contact.phone || contact.whatsapp || contact.instagram || contact.website) && (
                  <div className="mt-3 flex gap-2">
                    {contact.phone && <ContactIcon icon={<Phone size={13} />} />}
                    {contact.whatsapp && <ContactIcon icon={<MessageCircle size={13} />} />}
                    {contact.instagram && <ContactIcon icon={<AtSign size={13} />} />}
                    {contact.website && <ContactIcon icon={<Globe size={13} />} />}
                  </div>
                )}
                {latestPost && (
                  <div className="mt-3 flex gap-2 rounded-kp bg-surface p-2">
                    {latestPost.image && <img src={latestPost.image} alt="" className="size-10 shrink-0 rounded-sm object-cover" />}
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-[11px] font-semibold text-ink">{latestPost.title}</p>
                      <p className="text-[10px] text-muted">Novedad reciente</p>
                    </div>
                  </div>
                )}
                <p className="mt-3 border-t border-dashed border-ink/20 pt-2 text-[10px] leading-snug text-muted">
                  Estas secciones aparecerán cuando la app las incluya.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <figcaption className="mt-3 max-w-[19rem] text-center text-caption text-muted">
        Así se ve tu ficha en la app. Cambia mientras editas.
      </figcaption>
    </figure>
  )
}

function ContactIcon({ icon }: { icon: ReactNode }) {
  return <span className="flex size-7 items-center justify-center rounded-full border border-divider bg-surface text-ink">{icon}</span>
}
