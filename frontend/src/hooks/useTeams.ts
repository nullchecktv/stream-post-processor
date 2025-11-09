import { useContext } from 'react'
import { TeamContext } from '../contexts/TeamContext'

export function useTeams() {
  const context = useContext(TeamContext)

  if (context === undefined) {
    throw new Error('useTeams must be used within a TeamProvider')
  }

  return context
}
