import { useEffect, useState } from 'react'
import { nowMinutes, todayISO } from '@/lib/dates'

/** Hoy y la hora en Managua, al minuto. */
export function useNow() {
  const [now, setNow] = useState(() => ({ today: todayISO(), minutes: nowMinutes() }))
  useEffect(() => {
    const timer = window.setInterval(() => setNow({ today: todayISO(), minutes: nowMinutes() }), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}
