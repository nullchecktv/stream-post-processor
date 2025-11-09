import { useState, memo } from 'react'
import { Users, Calendar, Clock, Check, X } from 'lucide-react'
import { Button } from '../common/Button'

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
    } catch (error) {
      setAccepting(false)
    }
  }

  const handleReject = async () => {
    try {
      setRejecting(true)
      await onReject(invitation.invitationId)
    } catch (error) {
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
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
          <Users className="w-6 h-6 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {invitation.teamName}
              </h3>
              {invitation.teamDescription && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {invitation.teamDescription}
                </p>
              )}
            </div>

            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary flex-shrink-0">
              {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
            <div className="flex items-center gap-1">
              <span>Invited by</span>
              <span className="font-medium text-gray-700">{invitation.inviterName}</span>
            </div>

            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(invitation.invitedAt)}</span>
            </div>

            {invitation.expiresAt && (
              <div className={`flex items-center gap-1 ${isExpired ? 'text-red-600' : ''}`}>
                <Clock className="w-4 h-4" />
                <span>
                  {isExpired ? 'Expired' : `Expires ${formatDate(invitation.expiresAt)}`}
                </span>
              </div>
            )}
          </div>

          {isExpired ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                This invitation has expired. Please contact the team owner for a new invitation.
              </p>
            </div>
          ) : (
            <div className="flex gap-3">
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
