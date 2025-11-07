import { useState, useEffect, useCallback } from 'react'

const HELP_TIPS_KEY = 'helpTips'

interface HelpTipsState {
  [tipId: string]: boolean
}

export function useHelpTips() {
  const [dismissedTips, setDismissedTips] = useState<HelpTipsState>({})

  useEffect(() => {
    const stored = localStorage.getItem(HELP_TIPS_KEY)
    if (stored) {
      try {
        setDismissedTips(JSON.parse(stored))
      } catch (error) {
        console.error('Failed to parse help tips from localStorage:', error)
        setDismissedTips({})
      }
    }
  }, [])

  const isDismissed = useCallback(
    (tipId: string): boolean => {
      return dismissedTips[tipId] === true
    },
    [dismissedTips]
  )

  const dismissTip = useCallback((tipId: string) => {
    setDismissedTips((prev) => {
      const updated = { ...prev, [tipId]: true }
      localStorage.setItem(HELP_TIPS_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const resetTips = useCallback(() => {
    setDismissedTips({})
    localStorage.removeItem(HELP_TIPS_KEY)
  }, [])

  const resetTip = useCallback((tipId: string) => {
    setDismissedTips((prev) => {
      const updated = { ...prev }
      delete updated[tipId]
      localStorage.setItem(HELP_TIPS_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  return {
    isDismissed,
    dismissTip,
    resetTips,
    resetTip,
    dismissedTips,
  }
}
