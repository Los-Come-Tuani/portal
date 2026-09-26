import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'kplan.portal.sidebar'

interface SidebarPreferences {
  collapsed: boolean
  /** Los grupos que la persona abrió o cerró a mano. */
  groups: Record<string, boolean>
}

function read(): SidebarPreferences {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<SidebarPreferences> | null
    return { collapsed: stored?.collapsed === true, groups: stored?.groups ?? {} }
  } catch {
    return { collapsed: false, groups: {} }
  }
}

/** Cómo dejó cada quien su barra lateral, recordado en este navegador. */
export function useSidebarPreferences() {
  const [preferences, setPreferences] = useState(read)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    } catch {
      // Sin espacio o en modo privado: se olvida al recargar.
    }
  }, [preferences])

  const toggleCollapsed = useCallback(
    () => setPreferences((current) => ({ ...current, collapsed: !current.collapsed })),
    [],
  )

  const setGroupOpen = useCallback(
    (groupId: string, open: boolean) =>
      setPreferences((current) => ({ ...current, groups: { ...current.groups, [groupId]: open } })),
    [],
  )

  return { collapsed: preferences.collapsed, groups: preferences.groups, toggleCollapsed, setGroupOpen }
}
