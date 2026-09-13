import { useCallback, useEffect, useRef, useState } from 'react'
export type Panel = 'navigate' | 'settings' | 'welcome' | null
const INTRO_KEY = 'scripture-scribe-introduction-v1'
function firstVisit() {
  try { return !localStorage.getItem(INTRO_KEY) && !localStorage.getItem('scripture-scribe-library-v3') && !localStorage.getItem('scripture-scribe-state-v2') }
  catch { return false }
}
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
export function usePanelMotion() {
  const [panel, updatePanel] = useState<Panel>(() => firstVisit() ? 'welcome' : null)
  const [departing, setDeparting] = useState<Panel>(null)
  const active = useRef(panel)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const setPanel = useCallback((next: Panel) => {
    clearTimeout(timer.current)
    const previous = active.current
    if (previous === 'welcome' && next !== 'welcome') { try { localStorage.setItem(INTRO_KEY, 'seen') } catch { /* No loss of writing data if preferences cannot save. */ } }
    active.current = next
    updatePanel(next)
    setDeparting(next === null && !reduced() ? previous : null)
    if (next === null) timer.current = setTimeout(() => setDeparting(null), 160)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])
  return { panel, shownPanel: panel ?? departing, setPanel }
}
