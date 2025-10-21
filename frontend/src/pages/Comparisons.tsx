import React from 'react'
import { User } from '../types'

interface ComparisonsProps {
  user: User
}

// Saved comparisons page - basic implementation for now
const Comparisons: React.FC<ComparisonsProps> = ({ user }) => {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Cost Comparisons</h1>
        <p className="mt-2 text-gray-600">
          View and manage your saved cloud cost comparisons.
        </p>
      </div>

      {/* Empty state for now */}
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No saved comparisons</h3>
        <p className="mt-1 text-sm text-gray-500">
          Save cost comparisons from the dashboard to see them here.
        </p>
      </div>
    </div>
  )
}

export default Comparisons
