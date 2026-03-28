import { useEffect, useState, useCallback, useRef } from 'react'

interface KeyboardShortcutsConfig {
  enabled: boolean
  gameStarted: boolean
  showActionPanel: boolean
  subActionsCount: number
  onSelectPlayerByZone: (zone: number) => void
  onChangeFundamento: (fundamento: string) => void
  onSelectResult: (index: number) => void
  onClose: () => void
  onUndo?: () => void
  onOpponentError?: () => void
  onFocusTimestamp?: () => void
  enabledFundamentos?: string[]
}

const FUNDAMENTO_KEYS: Record<string, string> = {
  s: 'serve',
  r: 'reception',
  a: 'attack',
  b: 'block',
  d: 'dig',
  l: 'set',
}

export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null)
  const configRef = useRef(config)
  configRef.current = config

  useEffect(() => {
    if (!configRef.current.enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const c = configRef.current

      // Ignore when typing in text inputs
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return
      }

      const key = e.key.toLowerCase()

      // Escape - close panel
      if (key === 'escape') {
        if (c.showActionPanel) {
          e.preventDefault()
          c.onClose()
        }
        return
      }

      // T - focus timestamp input (only when panel is closed)
      if (key === 't' && !c.showActionPanel && c.gameStarted) {
        e.preventDefault()
        c.onFocusTimestamp?.()
        return
      }

      // Z or Ctrl+Z - undo (only when panel is closed)
      if (key === 'z' && !c.showActionPanel) {
        e.preventDefault()
        c.onUndo?.()
        return
      }

      // Space - opponent error (only when panel is closed and game started)
      if (key === ' ' && !c.showActionPanel && c.gameStarted) {
        e.preventDefault()
        c.onOpponentError?.()
        return
      }

      // When ActionPanel is OPEN
      if (c.showActionPanel) {
        // Fundamento keys (S, R, A, B, D, L) - filtered by enabled
        if (FUNDAMENTO_KEYS[key]) {
          const fund = FUNDAMENTO_KEYS[key]
          if (!c.enabledFundamentos || c.enabledFundamentos.includes(fund)) {
            e.preventDefault()
            c.onChangeFundamento(fund)
            flash(key)
          }
          return
        }

        // Result keys (1-5)
        const num = parseInt(key)
        if (num >= 1 && num <= 5 && num <= c.subActionsCount) {
          e.preventDefault()
          c.onSelectResult(num - 1)
          flash(key)
          return
        }
        return
      }

      // When ActionPanel is CLOSED and game started
      if (!c.showActionPanel && c.gameStarted) {
        // Player selection by zone (1-6)
        const num = parseInt(key)
        if (num >= 1 && num <= 6) {
          e.preventDefault()
          c.onSelectPlayerByZone(num)
          flash(key)
          return
        }
      }
    }

    function flash(key: string) {
      setHighlightedKey(key)
      setTimeout(() => setHighlightedKey(null), 200)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [config.enabled])

  return { highlightedKey }
}
