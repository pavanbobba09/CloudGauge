import React from 'react'
import { User } from '../types'

interface ProfileProps {
  user: User
  onUpdate: (user: User) => void
}

// User profile page - basic implementation for now
const Profile: React.FC<ProfileProps> = ({ user, onUpdate }) => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Profile Settings
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Manage your account settings and preferences.</p>
          </div>
          
          {/* Profile content - TODO: implement full profile management */}
          <div className="mt-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">First name</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.firstName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last name</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.lastName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Member since</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(user.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
