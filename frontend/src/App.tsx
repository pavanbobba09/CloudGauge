import React, { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Comparisons from './pages/Comparisons'
import { User } from './types'

// Main App component with routing and user state management
function App() {
  const [user, setUser] = useState<User | null>(null)
  
  // Check if user is authenticated
  // TODO: implement proper token validation later
  const isAuthenticated = !!user

  // Simple logout handler - quick implementation for now
  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('authToken')
    // console.log('User logged out') // debug line for development
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header user={user} onLogout={handleLogout} />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <Routes>
          <Route 
            path="/" 
            element={<Dashboard isAuthenticated={isAuthenticated} />} 
          />
          <Route 
            path="/login" 
            element={<Login onLogin={setUser} />} 
          />
          <Route 
            path="/register" 
            element={<Register onRegister={setUser} />} 
          />
          {/* Protected routes - basic check here */}
          {isAuthenticated && (
            <>
              <Route 
                path="/profile" 
                element={<Profile user={user!} onUpdate={setUser} />} 
              />
              <Route 
                path="/comparisons" 
                element={<Comparisons user={user!} />} 
              />
            </>
          )}
        </Routes>
      </main>
      
      <Footer />
    </div>
  )
}

export default App
