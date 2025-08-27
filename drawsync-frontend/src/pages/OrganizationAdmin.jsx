// src/pages/OrganizationAdmin.jsx - KORJATTU TÄYDELLINEN VERSIO
import { useState, useEffect } from 'react'
import { db } from '../services/database'
import { useOrganization } from '../contexts/OrganizationContext'
import { apiClient } from '../utils/apiClient'
import { getSubdomain } from '../utils/subdomain'
import { 
  Users, 
  Mail, 
  Settings, 
  UserPlus, 
  Check, 
  Copy,
  Trash2,
  Crown,
  User,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'

export default function OrganizationAdmin() {
  const { organization, user: currentUser } = useOrganization()
  const [activeTab, setActiveTab] = useState('members')
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    if (organization) {
      loadData()
    }
  }, [organization])

  const loadData = async () => {
    try {
      setLoading(true)
      const [membersData, invitationsData] = await Promise.all([
        db.getUsersInOrganization(organization.id),
        db.getInvitations(organization.id)
      ])
      
      setMembers(membersData || [])
      setInvitations(invitationsData || [])
    } catch (error) {
      console.error('Failed to load organization data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (userId, userEmail) => {
    try {
      await db.removeUserFromOrganization(userId, organization.id)
      await loadData()
      setDeleteConfirm(null)
      alert(`Removed ${userEmail} from organization`)
    } catch (error) {
      console.error('Failed to remove member:', error)
      alert('Failed to remove member: ' + error.message)
    }
  }

  const tabs = [
    { id: 'members', name: 'Members', icon: Users, count: members.length },
    { id: 'invitations', name: 'Invitations', icon: Mail, count: invitations.length },
    { id: 'settings', name: 'Settings', icon: Settings, count: null }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600">Manage members and invitations for {organization.name}</p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.name}
                {tab.count !== null && (
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'members' && <MembersTab members={members} onRefresh={loadData} onRemoveMember={handleRemoveMember} />}
        {activeTab === 'invitations' && <InvitationsTab invitations={invitations} onRefresh={loadData} organization={organization} />}
        {activeTab === 'settings' && <SettingsTab organization={organization} />}
      </div>

      {showInviteModal && (
        <InviteModal 
          organization={organization}
          currentUser={currentUser}
          onClose={() => setShowInviteModal(false)}
          onSuccess={loadData}
        />
      )}

      {/* Invite Button */}
      <div className="fixed bottom-6 right-6">
        <button
          onClick={() => setShowInviteModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-colors"
        >
          <UserPlus className="h-6 w-6" />
        </button>
      </div>
    </>
  )
}

// ✅ MEMBERS TAB - Korjattu
const MembersTab = ({ members, onRefresh, onRemoveMember }) => {
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  return (
    <>
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Team Members</h3>
          <p className="text-sm text-gray-500">People who have access to this organization</p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {members.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No members found
            </div>
          ) : (
            members.map((member) => (
              <div key={member.user_id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {member.user_id}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      {member.role === 'owner' && <Crown className="h-4 w-4 text-yellow-500" />}
                      {member.role}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {new Date(member.created_at).toLocaleDateString()}
                  </span>
                  {member.role !== 'owner' && (
                    <button
                      onClick={() => setDeleteConfirm(member)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Remove Member</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove <strong>{deleteConfirm.user_id}</strong> from the team? 
              They will lose access to all organization projects.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onRemoveMember(deleteConfirm.user_id, deleteConfirm.user_id)
                  setDeleteConfirm(null)
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Remove Member
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ✅ INVITATIONS TAB - Korjattu
const InvitationsTab = ({ invitations, onRefresh, organization }) => {
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // ✅ KORJATTU deleteInvitation
  const handleDeleteInvitation = async (invitationId) => {
    try {
      await db.deleteInvitation(invitationId)  // ← OIKEA db importti!
      onRefresh()
      setDeleteConfirm(null)
      alert('Invitation deleted')
    } catch (error) {
      console.error('Failed to delete invitation:', error)
      alert('Failed to delete invitation: ' + error.message)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fi-FI', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800', 
      expired: 'bg-red-100 text-red-800'
    }
    return colors[status] || colors.pending
  }

  // ✅ KORJATTU kutsulinkin kopiointi
  const copyInviteLink = (token) => {
    const inviteUrl = `https://wisuron.fi/join?token=${token}&org=${organization.slug}`
    
    navigator.clipboard.writeText(inviteUrl)
    alert('Invite link copied to clipboard!')
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Pending Invitations</h3>
          <p className="text-sm text-gray-500">Invitations that haven't been accepted yet</p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {invitations.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No invitations found
            </div>
          ) : (
            invitations.map((invitation) => (
              <div key={invitation.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <Mail className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{invitation.email_address}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-2">
                        <span>Role: {invitation.role}</span>
                        <span>•</span>
                        <span>Sent: {formatDate(invitation.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invitation.status)}`}>
                      {invitation.status}
                    </span>
                    
                    {invitation.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyInviteLink(invitation.token)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Copy invite link"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(invitation)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete invitation"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Invitation</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the invitation for <strong>{deleteConfirm.email_address}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteInvitation(deleteConfirm.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete Invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Settings Tab Component
const SettingsTab = ({ organization }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <h3 className="text-lg font-semibold mb-4">Organization Settings</h3>
    <p className="text-gray-600">Settings coming soon...</p>
  </div>
)

// ✅ INVITE MODAL - Korjattu
const InviteModal = ({ organization, currentUser, onClose, onSuccess }) => {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('user')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [invitation, setInvitation] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (!email || !email.includes('@')) {
        throw new Error('Please enter a valid email address')
      }

      // 1. Create invitation in database
      const newInvitation = await db.createInvitation(
        organization.id,
        email,
        role,
        currentUser.id
      )

      setInvitation(newInvitation)

      // 2. Send invitation email via backend
      const emailResponse = await apiClient.postJson('/invitations/send', {
        invitation_token: newInvitation.token,
        recipient_email: email,
        organization_name: organization.name,
        inviter_name: currentUser.email,
        role: role
      })

      if (!emailResponse.ok) {
        throw new Error('Email sending failed')
      }

      console.log('Invitation email sent:', emailResponse.id)
      setShowSuccess(true)

      // Reset form
      setEmail('')
      setRole('user')

    } catch (error) {
      console.error('Failed to create invitation:', error)
      setError(error.message || 'Failed to send invitation')
    } finally {
      setIsLoading(false)
    }
  }

  const closeModal = () => {
    setShowSuccess(false)
    onClose()
    if (showSuccess) {
      onSuccess() // Refresh data
    }
  }

  // ✅ Success modal with corrected invite URL
  if (showSuccess) {
    const inviteUrl = `https://wisuron.fi/join?token=${invitation.token}&org=${organization.slug}`
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Invitation Sent!
            </h3>
            <p className="text-gray-600 mb-4">
              Invitation email sent to <strong>{email}</strong>
            </p>
            
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invite Link:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inviteUrl}
                  readOnly
                  className="flex-1 text-sm bg-white border border-gray-300 rounded px-3 py-2"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(inviteUrl)
                    alert('Invite link copied to clipboard!')
                  }}
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
                >
                  <Copy className="h-4 w-4" />Copy
                </button>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mb-6">
              The recipient will receive an email with instructions to join your organization.
              Invitation expires in 7 days.
            </p>
            
            <button
              onClick={closeModal}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Invite form modal
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Invite Team Member</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isLoading}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !email}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Sending Invite...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}