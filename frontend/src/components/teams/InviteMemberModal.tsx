import { useState } from 'react'
import { Modal } from '../common/Modal'
import { Input } from '../common/Input'
import { Button } from '../common/Button'
import { useTeams } from '../../hooks/useTeams'
import { useToast } from '../../hooks/useToast'

interface InviteMemberModalProps {
  isOpen: boolean
  onClose: () => void
  teamId: string
  onSuccess: () => void
}

export function InviteMemberModal({ isOpen, onClose, teamId, onSuccess }: InviteMemberModalProps) {
  const { inviteMember } = useTeams()
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'administrator' | 'member'>('member')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Email is required')
      return
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    try {
      setLoading(true)
      await inviteMember(teamId, email.trim(), role)

      showToast(
        `Invitation sent to ${email}`,
        'success'
      )

      setEmail('')
      setRole('member')
      onSuccess()
      onClose()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send invitation'

      if (errorMessage.includes('already a member') || errorMessage.includes('duplicate')) {
        setError('This user is already a member of the team')
      } else if (errorMessage.includes('invalid email')) {
        setError('Please enter a valid email address')
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setEmail('')
      setRole('member')
      setError('')
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Invite Team Member" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError('')
            }}
            placeholder="colleague@example.com"
            error={error}
            disabled={loading}
            autoFocus
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            If the user already has an account, they'll be added immediately. Otherwise, they'll receive an invitation email.
          </p>
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as 'administrator' | 'member')}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="member">Member</option>
            <option value="administrator">Administrator</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            {role === 'administrator'
              ? 'Administrators can invite and remove members'
              : 'Members can view and collaborate on team content'}
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            onClick={handleClose}
            variant="ghost"
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={loading}
            className="flex-1"
          >
            Send Invitation
          </Button>
        </div>
      </form>
    </Modal>
  )
}
