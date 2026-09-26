import { usePlaces } from '@/data/hooks/use-places'
import { useSession } from '@/features/auth/use-auth'
import { Agenda } from '@/features/arrivals/Agenda'
import { DropReasons } from '@/features/arrivals/components/DropReasons'
import { ALL_PLACES, CITY_PREFIX, useAgendaState } from '@/features/arrivals/hooks/use-agenda'
import { paths } from '@/app/router/paths'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { AdminPending } from './components/AdminPending'
import { PlaceNudges } from './components/PlaceNudges'
import { TopDroppedPlaces } from './components/TopDroppedPlaces'

/** El inicio de todos los roles es la agenda de llegadas. */
export function DashboardPage() {
  useDocumentTitle('Agenda')
  const { isAdmin, role, organizationId } = useSession()
  const state = useAgendaState()
  const places = usePlaces(isAdmin ? {} : { organizationId })

  const onePlace = state.place !== ALL_PLACES && !state.place.startsWith(CITY_PREFIX) ? state.place : null
  const cityStops = state.place.startsWith(CITY_PREFIX)
    ? places.data?.filter((stop) => stop.city === state.place.slice(CITY_PREFIX.length)).map((stop) => stop.id)
    : undefined
  const scopedPlaces = onePlace ? places.data?.filter((stop) => stop.id === onePlace) : places.data
  const profilePath =
    onePlace ? paths.place(onePlace) : places.data?.length === 1 ? paths.place(places.data[0].id) : paths.places

  return (
    <div className="flex flex-col gap-8">
      {isAdmin && <AdminPending />}
      <Agenda state={state} />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <DropReasons
          stopIds={onePlace ? [onePlace] : cityStops}
          today={state.today}
          profilePath={profilePath}
          canOfferCoupons={role === 'negocio'}
        />
        {isAdmin ? (
          <TopDroppedPlaces stopIds={cityStops} today={state.today} places={places.data} />
        ) : (
          <PlaceNudges places={scopedPlaces} loading={places.isPending} />
        )}
      </div>
    </div>
  )
}
