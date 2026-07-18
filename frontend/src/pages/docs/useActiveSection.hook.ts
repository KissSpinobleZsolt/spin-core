import { useState, useEffect } from 'react'

// Tracks which section anchor is currently visible in the <main> scroll container.
export function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState(ids[0] ?? '') // default to first id on mount

  useEffect(() => {
    const root = document.querySelector('main') // <main> carries overflow-y:auto; default viewport root would miss scroll events
    const visible = new Set<string>() // tracks which ids are currently intersecting

    const observers = ids.map(id => {
      const el = document.getElementById(id) // find the section's anchor element by id
      if (!el) return null
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) visible.add(id) // mark as visible when entering viewport
          else visible.delete(id) // remove when scrolled out
          const first = ids.find(i => visible.has(i)) // pick topmost visible id
          if (first) setActive(first)
        },
        // -60% bottom margin: section becomes active once it enters the top 40% of the viewport
        { root, rootMargin: '0px 0px -60% 0px', threshold: 0 },
      )
      obs.observe(el)
      return obs
    })

    return () => observers.forEach(o => o?.disconnect()) // disconnect all observers on cleanup
  }, [ids])

  return active // id of the currently active section
}
