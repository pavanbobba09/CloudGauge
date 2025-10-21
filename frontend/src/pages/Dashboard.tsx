import React, { useState } from 'react'
import { ResourceSpecs, PricingResult, LoadingState } from '../types'
import ResourceForm from '../components/ResourceForm'
import CostComparisonTable from '../components/CostComparisonTable'
import CostChart from '../components/CostChart'
import LoadingSpinner from '../components/LoadingSpinner'
import { calculateCosts } from '../services/api'

interface DashboardProps {
  isAuthenticated: boolean
}

// Main dashboard where users input requirements and see cost comparisons
const Dashboard: React.FC<DashboardProps> = ({ isAuthenticated }) => {
  const [results, setResults] = useState<PricingResult[]>([])
  const [loadingState, setLoadingState] = useState<LoadingState>({ isLoading: false })
  const [error, setError] = useState<string | null>(null)
  
  // Handle form submission - this is where the magic happens
  const handleCalculateCosts = async (specs: ResourceSpecs) => {
    setLoadingState({ isLoading: true, operation: 'Calculating costs across providers...' })
    setError(null)
    
    try {
      // Call our backend API to calculate costs
      const response = await calculateCosts(specs)
      
      if (response.success && response.data) {
        setResults(response.data)
        // console.log('Cost calculation successful:', response.data) // debug line
      } else {
        throw new Error(response.error || 'Failed to calculate costs')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong'
      setError(errorMessage)
      // console.error('Cost calculation failed:', err) // debug for development
    } finally {
      setLoadingState({ isLoading: false })
    }
  }

  // Quick hack to handle different sorting options
  const [sortBy, setSortBy] = useState<'cost' | 'provider' | 'savings'>('cost')
  
  const sortedResults = [...results].sort((a, b) => {
    switch (sortBy) {
      case 'cost':
        return a.monthlycost - b.monthlycost
      case 'provider':
        return a.provider.name.localeCompare(b.provider.name)
      case 'savings':
        // Show best savings first
        const aSavings = a.savings?.percentSaved || 0
        const bSavings = b.savings?.percentSaved || 0
        return bSavings - aSavings
      default:
        return 0
    }
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <div className="space-y-8 p-4 max-w-7xl mx-auto">
        {/* Modern Hero Section */}
        <div className="text-center py-12">
          <div className="mb-6">
            <span className="text-6xl mb-4 block">☁️💰</span>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent mb-6">
            Cloud Cost Optimizer
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
            Compare infrastructure costs across <span className="font-semibold text-orange-600">AWS</span>, 
            <span className="font-semibold text-blue-600"> Google Cloud</span>, and 
            <span className="font-semibold text-indigo-600"> Azure</span>. 
            Get intelligent recommendations to <span className="font-semibold text-green-600">save up to 60%</span> on your cloud spend.
          </p>
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto mb-8">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="text-2xl font-bold text-blue-600">20+</div>
              <div className="text-sm text-slate-600">Services Supported</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="text-2xl font-bold text-green-600">$50K+</div>
              <div className="text-sm text-slate-600">Avg. Annual Savings</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="text-2xl font-bold text-purple-600">3 Min</div>
              <div className="text-sm text-slate-600">Setup Time</div>
            </div>
          </div>
        </div>

        {/* Resource specification form */}
        <ResourceForm onSubmit={handleCalculateCosts} />

      {/* Loading state */}
      {loadingState.isLoading && (
        <LoadingSpinner message={loadingState.operation} />
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Calculation Error
              </h3>
              <p className="text-sm text-red-700 mt-1">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results section */}
      {results.length > 0 && !loadingState.isLoading && (
        <div className="space-y-6">
          {/* Sort controls */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Cost Comparison Results
            </h2>
            <div className="flex items-center space-x-2">
              <label htmlFor="sort-select" className="text-sm text-gray-600">
                Sort by:
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="form-input text-sm"
              >
                <option value="cost">Lowest Cost</option>
                <option value="provider">Provider Name</option>
                <option value="savings">Best Savings</option>
              </select>
            </div>
          </div>

          {/* Cost visualization chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Monthly Cost Comparison
            </h3>
            <CostChart results={sortedResults} />
          </div>

          {/* Detailed comparison table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <CostComparisonTable 
              results={sortedResults} 
              isAuthenticated={isAuthenticated}
            />
          </div>

          {/* Quick savings summary */}
          {sortedResults.length > 1 && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Potential Savings Identified
                  </h3>
                  <p className="text-sm text-green-700 mt-1">
                    You could save ${(sortedResults[sortedResults.length - 1].monthlycost - sortedResults[0].monthlycost).toFixed(2)} 
                    per month by choosing {sortedResults[0].provider.name} over {sortedResults[sortedResults.length - 1].provider.name}.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

        {/* No results state */}
        {results.length === 0 && !loadingState.isLoading && !error && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-medium text-slate-700 mb-2">Ready to Compare Costs?</h3>
            <p className="text-slate-500">
              Select your services and configure your requirements above to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
