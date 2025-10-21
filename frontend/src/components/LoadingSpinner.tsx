import React from 'react'

interface LoadingSpinnerProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

// Reusable loading spinner component
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Loading...', 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  }

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className={`spinner ${sizeClasses[size]}`}></div>
      {message && (
        <p className="text-gray-600 mt-4 text-sm">
          {message}
        </p>
      )}
    </div>
  )
}

export default LoadingSpinner
