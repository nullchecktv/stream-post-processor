import { useState, memo } from 'react'
import { Users, Calendar, Clock, Check, X } from 'lucide-react'
import { Button } from '../common/Button'
import { Badge } from '../common/Badge'

interface InvitationCardProps {
  invitation: {
    invitationId: string
    teamName: string
    teamId: string
    teamDescription?: string
    inviterName: string
    role: string
    invitedAt: string
    expiresAt?: string
  }
  onAccept: (invitationId: string) => Promise<void>
  onReject: (invitationId: string) => Promise<void>
}

export const InvitationCard = memo(function InvitationCard({ invitation, onAccept, onReject }: InvitationCardProps) {
  const [accepting, setAccepting] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  const handleAccept = async () => {
    try {
      setAccepting(true)
      await onAccept(invitation.invitationId)
    } catch (_error) {
      setAccepting(false)
    }
  }

  const handleReject = async () => {
    try {
      setRejecting(true)
      await onReject(invitation.invitationId)
    } catch (_error) {
      setRejecting(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const isExpired = invitation.expiresAt && new Date(invitation.expiresAt) < new Date()
  const isProcessing = accepting || rejecting

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-[var(--space-6)] hover:bg-[var(--color-surface-hover)] transition-colors duration-[var(--duration-fast)]">
      <div className="flex items-start gap-[var(--space-4)]">
        <div className="w-12 h-12 bg-[var(--color-accent-subtle)] rounded-full flex items-center justify-center flex-shrink-0">
          <Users className="w-6 h-6 text-[var(--color-accent)]" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-[var(--space-4)] mb-[var(--space-2)]">
            <div className="flex-1 min-w-0">
              <h3 className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text-primary)] truncate">
                {invitation.teamName}
              </h3>
              {invitation.teamDescription && (
                <p className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)] mt-1 line-clamp-2">
                  {invitation.teamDescription}
                </p>
              )}
            </div>

            <Badge variant="accent" size="sm">
              {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--color-text-muted)] mb-[var(--space-4)]">
            <div className="flex items-center gap-1">
              <span>Invited by</span>
              <span className="font-medium text-[var(--color-text-secondary)]">{invitation.inviterName}</span>
            </div>

            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(invitation.invitedAt)}</span>
            </div>

            {invitation.expiresAt && (
              <div className={`flex items-center gap-1 ${isExpired ? 'text-[var(--color-error)]' : ''}`}>
                <Clock className="w-4 h-4" />
                <span>
                  {isExpired ? 'Expired' : `Expires ${formatDate(invitation.expiresAt)}`}
                </span>
              </div>
            )}
          </div>

          {isExpired ? (
            <div className="bg-[var(--color-error)]/10 border border-[var(--color-error)] rounded-[var(--radius-md)] p-[var(--space-3)]">
              <p className="text-[length:var(--text-sm)] text-[var(--color-error)]">
                This invitation has expired. Please contact the team owner for a new invitation.
              </p>
            </div>
          ) : (
            <div className="flex gap-[var(--space-3)]">
              <Button
                onClick={handleAccept}
                loading={accepting}
                disabled={isProcessing}
                variant="primary"
                size="sm"
                className="flex-1"
              >
                <Check className="w-4 h-4 mr-1" />
                Accept Invitation
              </Button>

              <Button
                onClick={handleReject}
                loading={rejecting}
                disabled={isProcessing}
                variant="ghost"
                size="sm"
                className="flex-1"
              >
                <X className="w-4 h-4 mr-1" />
                Decline
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
