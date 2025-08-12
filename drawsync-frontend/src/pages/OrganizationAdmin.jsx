// src/pages/OrganizationAdmin.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Users, 
  UserPlus, 
  Mail, 
  Shield, 
  Copy,
  Trash2,
  Check,
  Clock,
  Settings
} from 'lucide-react'
import { useOrganization } from '../contexts/OrganizationContext'
import { db } from '../services/database'
import NavigationHeader from '../components/NavigationHeader'

export default function OrganizationAdmin() {
  const { organization, user } = useOrganization()
  const navigate = useNavigate()
  
  const [activeTab, setActiveTab] = useState('members')
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)

  useEffect(() => {
    if (!organization || !user) return
    loadData()
  }, [organization, user])

  const loadData = async () => {
    try {
      // Load team members
      const teamMembers = await db.getUsersInOrganization(organization.id)
      setMembers(teamMembers)
      
      // Load pending invitations
      const pendingInvites = await db.getInvitations(organization.id)
      setInvitations(pendingInvites)
    } catch (error) {
      console.error('Failed to load team data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInviteSuccess = () => {
    setShowInviteModal(false)
    loadData() // Refresh data
  }

  if (!organization || organization.type === 'PLATFORM_ADMIN' || organization.userRole !== 'owner') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-8">Only organization owners can access team management.</p>
          <button 
            onClick={() => navigate('/app')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            Back to App
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationHeader />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
            <p className="text-gray-600">Loading team data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{organization.name} - Team</h1>
              <p className="text-sm text-gray-600">Manage your team members and invitations</p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowInviteModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Invite Member
              </button>
              <button 
                onClick={() => navigate('/app')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
              >
                Back to App
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'members', name: 'Team Members', icon: Users, count: members.length },
              { id: 'invitations', name: 'Pending Invitations', icon: Mail, count: invitations.filter(i => i.status === 'pending').length },
              { id: 'settings', name: 'Settings', icon: Settings, count: null }
            ].map(tab => (
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
        {activeTab === 'members' && <MembersTab members={members} onRefresh={loadData} />}
        {activeTab === 'invitations' && <InvitationsTab invitations={invitations} onRefresh={loadData} />}
        {activeTab === 'settings' && <SettingsTab organization={organization} />}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          organization={organization}
          currentUser={user}
          onClose={() => setShowInviteModal(false)}
          onSuccess={handleInviteSuccess}
        />
      )}
    </div>
  )
}

// InviteModal Component
const InviteModal = ({ organization, currentUser, onClose, onSuccess }) => {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('user')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Validate email
      if (!email || !email.includes('@')) {
        throw new Error('Anna validi sähköpostiosoite')
      }

      // Create invitation
      const invitation = await db.createInvitation(
        organization.id,
        email,
        role,
        currentUser.id
      )

      // Generate invite link
      const baseUrl = window.location.origin
      const inviteUrl = `${baseUrl}/join?token=${invitation.token}`
      setInviteLink(inviteUrl)
      setShowSuccess(true)

      // Reset form
      setEmail('')
      setRole('user')

    } catch (error) {
      console.error('Failed to create invitation:', error)
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink)
    alert('Invite link copied to clipboard!')
  }

  const closeModal = () => {
    setShowSuccess(false)
    setInviteLink('')
    onClose()
    if (showSuccess) {
      onSuccess() // Refresh data
    }
  }

  if (showSuccess) {
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
              Invitation created for <strong>{email}</strong>
            </p>
            
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invite Link:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="flex-1 text-sm bg-white border border-gray-300 rounded px-3 py-2"
                />
                <button
                  onClick={copyInviteLink}
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mb-6">
              Share this link with the new team member. Link expires in 7 days.
            </p>
          </div>
          
          <div className="flex justify-center">
            <button
              onClick={closeModal}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Invite Team Member
        </h3>
        
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

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="user">User - Can create and view projects</option>
              <option value="admin">Admin - Can manage team members</option>
            </select>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !email}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />}
              {isLoading ? 'Creating...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Other tab components (unchanged)
const MembersTab = ({ members, onRefresh }) => {
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  
  const handleRemoveMember = async (userId, userEmail) => {
    try {
      await db.removeUserFromOrganization(userId, members[0]?.organization_id)
      onRefresh()
      setDeleteConfirm(null)
      alert(`${userEmail} removed from team`)
    } catch (error) {
      console.error('Failed to remove member:', error)
      alert('Failed to remove member: ' + error.message)
    }
  }

  const getRoleDisplay = (role) => {
    const roleConfig = {
      owner: { label: 'Owner', color: 'bg-purple-100 text-purple-800' },
      admin: { label: 'Admin', color: 'bg-blue-100 text-blue-800' },
      user: { label: 'User', color: 'bg-gray-100 text-gray-800' }
    }
    return roleConfig[role] || roleConfig.user
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fi-FI', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (members.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-8 text-center">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No team members</h3>
          <p className="text-gray-500">Start by inviting your first team member.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Team Members ({members.length})
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map((member) => {
                const roleConfig = getRoleDisplay(member.role)
                
                return (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {member.user?.email?.charAt(0).toUpperCase() || member.user_id?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {member.user?.email || `User ${member.user_id?.slice(0, 8)}`}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {member.user_id?.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${roleConfig.color}`}>
                        {roleConfig.label}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(member.created_at)}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {member.role !== 'owner' ? (
                        <button
                          onClick={() => setDeleteConfirm(member)}
                          className="text-red-600 hover:text-red-800 flex items-center gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </button>
                      ) : (
                        <span className="text-gray-400 flex items-center gap-1">
                          <Shield className="h-4 w-4" />
                          Owner
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Remove confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Remove Team Member?
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove <strong>{deleteConfirm.user?.email || deleteConfirm.user_id}</strong> from the team? 
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
                onClick={() => handleRemoveMember(deleteConfirm.user_id, deleteConfirm.user?.email || deleteConfirm.user_id)}
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

// OrganizationAdmin.jsx - korvaa InvitationsTab:
const InvitationsTab = ({ invitations, onRefresh }) => {
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const handleDeleteInvitation = async (invitationId) => {
    try {
      await db.deleteInvitation(invitationId)
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

  const copyInviteLink = (token) => {
    const baseUrl = window.location.origin
    const inviteUrl = `${baseUrl}/join?token=${token}`
    navigator.clipboard.writeText(inviteUrl)
    alert('Invite link copied to clipboard!')
  }

  if (invitations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-8 text-center">
          <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No pending invitations</h3>
          <p className="text-gray-500">Invite new team members to get started.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Pending Invitations ({invitations.filter(i => i.status === 'pending').length})
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invited
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invitations.map((invitation) => {
                const isExpired = new Date(invitation.expires_at) < new Date()
                const actualStatus = isExpired ? 'expired' : invitation.status
                
                return (
                  <tr key={invitation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-gray-600 font-medium text-xs">
                              {invitation.email_address.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {invitation.email_address}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(actualStatus)}`}>
                        {actualStatus.charAt(0).toUpperCase() + actualStatus.slice(1)}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(invitation.created_at)}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(invitation.expires_at)}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {invitation.status === 'pending' && !isExpired && (
                          <button
                            onClick={() => copyInviteLink(invitation.token)}
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <Copy className="h-4 w-4" />
                            Copy Link
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteConfirm(invitation)}
                          className="text-red-600 hover:text-red-800 flex items-center gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete Invitation?
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the invitation for <strong>{deleteConfirm.email_address}</strong>? 
              This action cannot be undone.
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

const SettingsTab = ({ organization }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <h3 className="text-lg font-semibold mb-4">Organization Settings</h3>
    <p className="text-gray-600">Settings coming soon...</p>
  </div>
)