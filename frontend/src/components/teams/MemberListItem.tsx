import { useState, memo } from 'react'
import { Crown, Trash2, Calendar } from 'lucide-react'
import { Button } from '../common/Button'
import { Badge } from '../common/Badge'
import type { TeamMember } from '../../types'

interface MemberListItemProps {
  member: TeamMember
  currentUserId: string
  currentUserRole: 'owner' | 'administrator' | 'member'
  onRoleChange?: (userId: string, newRole: string) => Promise<void>
  onRemove?: (userId: string) => Promise<void>
}

export const MemberListItem = memo(function MemberListItem({
  member,
  currentUserId,
  currentUserRole,
  onRoleChange,
  onRemove,
}: MemberListItemProps) {
  const [changingRole, setChangingRole] = useState(false)
  const [removing, setRemoving] = useState(false)

  const isCurrentUser = member.userId === currentUserId
  const isOwner = member.role === 'owner'
  const canChangeRole = currentUserRole === 'owner' && !isOwner && !isCurrentUser
  const canRemove = (currentUserRole === 'owner' || currentUserRole === 'administrator') && !isOwner && !isCurrentUser

  const handleRoleChange = async (newRole: string) => {
    if (!onRoleChange || changingRole) return

    try {
      setChangingRole(true)
      await onRoleChange(member.userId, newRole)
    } catch (error) {
      console.error('Failed to change role:', error)
    } finally {
      setChangingRole(false)
    }
  }

  const handleRemove = async () => {
    if (!onRemove || removing) return

    const confirmed = window.confirm(
      `Are you sure you want to remove ${member.name || member.email} from the team?`
    )

    if (!confirmed) return

    try {
      setRemoving(true)
      await onRemove(member.userId)
    } catch (error) {
      console.error('Failed to remove member:', error)
      setRemoving(false)
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

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.split(' ')
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    }
    if (email) {
      return email.substring(0, 2).toUpperCase()
    }
    return '??'
  }

  const getRoleBadgeVariant = (role: string): 'accent' | 'info' | 'neutral' => {
    switch (role) {
      case 'owner':
        return 'accent'
      case 'administrator':
        return 'info'
      default:
        return 'neutral'
    }
  }

  return (
    <div className="flex items-center justify-between p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-10 h-10 bg-[var(--color-accent-subtle)] rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-[var(--color-accent)]">
            {getInitials(member.name, member.email)}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-[var(--color-text-primary)] truncate">
              {member.name || member.email}
              {isCurrentUser && (
                <span className="ml-2 text-xs text-[var(--color-text-muted)]">(You)</span>
              )}
            </h4>
            {isOwner && (
              <Crown className="w-4 h-4 text-[var(--color-warning)] flex-shrink-0" aria-label="Team Owner" />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-muted)]">
            <span className="truncate">{member.email}</span>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Joined {formatDate(member.joinedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 ml-4">
        {canChangeRole && onRoleChange ? (
          <select
            value={member.role}
            onChange={(e) => handleRoleChange(e.target.value)}
            disabled={changingRole}
            className="px-3 py-1.5 text-sm border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] focus:border-[var(--color-focus)] disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Change role for ${member.name || member.email}`}
          >
            <option value="administrator">Administrator</option>
            <option value="member">Member</option>
          </select>
        ) : (
          <Badge variant={getRoleBadgeVariant(member.role)} size="sm">
            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
          </Badge>
        )}

        {canRemove && onRemove && (
          <Button
            onClick={handleRemove}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleRemove()
              }
            }}
            loading={removing}
            disabled={removing}
            variant="ghost"
            size="sm"
            className="text-[var(--color-error)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
            aria-label={`Remove ${member.name || member.email}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
})
