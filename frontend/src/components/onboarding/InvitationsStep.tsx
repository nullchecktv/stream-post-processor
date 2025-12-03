import { useState, useEffect } from 'react'
import { useActivity } from '../../hooks/useActivity'
import { useTeams } from '../../hooks/useTeams'
import { useToast } from '../../hooks/useToast'
import type { Notification } from '../../types'

interface InvitationsStepProps {
  onComplete: () => void
  onSkip: () => void
}

export function InvitationsStep({ onComplete, onSkip }: InvitationsStepProps) {
  const { notifications, loading, acceptInvitation, rejectInvitation } = useActivity()
  const { fetchTeams } = useTeams()
  const { showToast } = useToast()
  const [processingInvitations, setProcessingInvitations] = useState<Set<string>>(new Set())

  const invitationNotifications = notifications.filter(
    n => n.type === 'team_invitation' && !n.isRead
  )

  useEffect(() => {
    if (!loading && invitationNotifications.length === 0) {
      onSkip()
    }
  }, [loading, invitationNotifications.length, onSkip])

  const handleAccept = async (notification: Notification) => {
    if (!notification.data?.invitationId) return

    setProcessingInvitations(prev => new Set(prev).add(notification.id))

    try {
      await acceptInvitation(notification.data.invitationId)
      await fetchTeams()
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to accept invitation',
        'error'
      )
    } finally {
      setProcessingInvitations(prev => {
        const next = new Set(prev)
        next.delete(notification.id)
        return next
      })
    }
  }

  const handleReject = async (notification: Notification) => {
    if (!notification.data?.invitationId) return

    setProcessingInvitations(prev => new Set(prev).add(notification.id))

    try {
      await rejectInvitation(notification.data.invitationId)
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to decline invitation',
        'error'
      )
    } finally {
      setProcessingInvitations(prev => {
        const next = new Set(prev)
        next.delete(notification.id)
        return next
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (invitationNotifications.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-gray-600 mb-4">
          You have {invitationNotifications.length} pending team{' '}
          {invitationNotifications.length === 1 ? 'invitation' : 'invitations'}. Review and respond
          to them below.
        </p>
      </div>

      <div className="space-y-4">
        {invitationNotifications.map(notification => {
          const isProcessing = processingInvitations.has(notification.id)
          const teamName = notification.data?.teamName || 'Unknown Team'
          const inviterName = notification.data?.inviterName || 'Someone'

          return (
            <div
              key={notification.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{teamName}</h3>
                  <p className="text-sm text-gray-600 mb-3">{notification.message}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>From: {inviterName}</span>
                    <span>•</span>
                    <span>{new Date(notification.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAccept(notification)}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#5B8C5A' }}
                  >
                    {isProcessing ? 'Processing...' : 'Accept'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(notification)}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Decline
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          I'll decide later
        </button>
        <button
          type="button"
          onClick={onComplete}
          className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
          style={{ backgroundColor: '#5B8C5A' }}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
