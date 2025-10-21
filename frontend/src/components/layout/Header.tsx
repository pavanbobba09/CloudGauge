import React from 'react'
import { Link } from 'react-router-dom'
import { User } from '../../types'

interface HeaderProps {
  user: User | null
  onLogout: () => void
}

// Header component with navigation and user management
const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo and brand */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CC</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">
              Cloud Cost Optimizer
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              to="/" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Dashboard
            </Link>
            
            {user ? (
              <>
                <Link 
                  to="/comparisons" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  My Comparisons
                </Link>
                <Link 
                  to="/profile" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Profile
                </Link>
                <button 
                  onClick={onLogout}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>

          {/* Mobile menu button - simple implementation for now */}
          <div className="md:hidden">
            <button className="text-gray-600 hover:text-gray-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* User greeting - personal touch */}
      {user && (
        <div className="bg-blue-50 border-b border-blue-100">
          <div className="container mx-auto px-4 py-2">
            <p className="text-sm text-blue-700">
              Welcome back, {user.firstName}! Ready to optimize some cloud costs? 💰
            </p>
          </div>
        </div>
      )}
    </header>
  )
}

export default Header
