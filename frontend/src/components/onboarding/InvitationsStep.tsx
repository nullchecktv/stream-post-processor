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
        <div className="w-8 h-8 border-4 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (invitationNotifications.length === 0) {
    return null
  }

  return (
    <div className="space-y-[var(--space-6)]">
      <div>
        <p className="text-[var(--color-text-secondary)] mb-[var(--space-4)]">
          You have {invitationNotifications.length} pending team{' '}
          {invitationNotifications.length === 1 ? 'invitation' : 'invitations'}. Review and respond
          to them below.
        </p>
      </div>

      <div className="space-y-[var(--space-4)]">
        {invitationNotifications.map(notification => {
          const isProcessing = processingInvitations.has(notification.id)
          const teamName = notification.data?.teamName || 'Unknown Team'
          const inviterName = notification.data?.inviterName || 'Someone'

          return (
            <div
              key={notification.id}
              className="border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[var(--radius-lg)] p-[var(--space-4)] hover:border-[var(--color-accent)] transition-colors duration-[var(--duration-fast)]"
            >
              <div className="flex items-start justify-between gap-[var(--space-4)]">
                <div className="flex-1">
                  <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">{teamName}</h3>
                  <p className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)] mb-[var(--space-3)]">{notification.message}</p>
                  <div className="flex items-center gap-[var(--space-2)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                    <span>From: {inviterName}</span>
                    <span>•</span>
                    <span>{new Date(notification.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-[var(--space-2)]">
                  <button
                    type="button"
                    onClick={() => handleAccept(notification)}
                    disabled={isProcessing}
                    className="px-[var(--space-4)] py-[var(--space-2)] bg-[var(--color-accent)] text-[var(--color-text-on-accent)] rounded-[var(--radius-md)] text-[length:var(--text-sm)] font-medium hover:bg-[var(--color-accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] transition-colors duration-[var(--duration-fast)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Processing...' : 'Accept'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(notification)}
                    disabled={isProcessing}
                    className="px-[var(--space-4)] py-[var(--space-2)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] rounded-[var(--radius-md)] text-[length:var(--text-sm)] font-medium hover:bg-[var(--color-surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] transition-colors duration-[var(--duration-fast)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Decline
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex justify-between items-center pt-[var(--space-4)] border-t border-[var(--color-border)]">
        <button
          type="button"
          onClick={onSkip}
          className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-[var(--duration-fast)]"
        >
          I'll decide later
        </button>
        <button
          type="button"
          onClick={onComplete}
          className="px-[var(--space-6)] py-[var(--space-2)] bg-[var(--color-accent)] text-[var(--color-text-on-accent)] rounded-[var(--radius-md)] font-medium hover:bg-[var(--color-accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] transition-colors duration-[var(--duration-fast)]"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
