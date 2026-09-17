import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import { getUsers, subscribeUsers } from '../data/userStore'
import UserAdd from './UserAdd'

// Edit User reuses the exact same form component as Add User, passing the
// existing user as UserAdd's `user` prop — that prop's presence is what
// switches the shared form into edit mode (prefilled fields, "Save Changes"
// instead of "Add User", etc.), same convention as
// SalesEditLead.jsx/SalesNewLead.jsx. This page's only job is looking up
// the user by route param and handling the not-found case.
export default function UserEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [users, setUsers] = useState(getUsers)

  useEffect(() => subscribeUsers(setUsers), [])

  const user = users.find(u => u.id === id)

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12">
        <p className="text-lg font-semibold text-gray-900 mb-2">User not found</p>
        <p className="text-sm text-gray-500 mb-6">
          The user ID <code className="bg-gray-100 px-2 py-0.5 rounded">{id}</code> does not exist.
        </p>
        <Button onClick={() => navigate('/users')}>Back to User Management</Button>
      </div>
    )
  }

  return <UserAdd user={user} />
}
