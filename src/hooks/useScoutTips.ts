import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'scout-tips-enabled'

export function useScoutTips() {
  const [showTips, setShowTips] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      setShowTips(stored === 'true')
    }
  }, [])

  const toggleTips = useCallback(() => {
    setShowTips((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  return { showTips, toggleTips }
}
