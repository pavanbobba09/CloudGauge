import React, { useState } from 'react'
import { PricingResult } from '../types'
import { saveComparison } from '../services/api'

interface CostComparisonTableProps {
  results: PricingResult[]
  isAuthenticated: boolean
}

// Modern, service-aware cost comparison component
const CostComparisonTable: React.FC<CostComparisonTableProps> = ({ 
  results, 
  isAuthenticated 
}) => {
  const [savingComparison, setSavingComparison] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview')

  // Save comparison for logged-in users
  const handleSaveComparison = async () => {
    if (!isAuthenticated) return

    setSavingComparison(true)
    try {
      // Use the first result's specs if available
      const mockSpecs = results[0]?.specs || {
        cpuCores: 4,
        ramGB: 16,
        storageGB: 500,
        region: 'us-east-1',
        operatingSystem: 'linux' as const
      }

      const response = await saveComparison({
        specs: mockSpecs,
        results: results,
        friendlyName: `Comparison ${new Date().toLocaleDateString()}`
      })

      if (response.success) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch (error) {
      console.error('Failed to save comparison:', error)
    } finally {
      setSavingComparison(false)
    }
  }

  // Service icons mapping
  const serviceIcons = {
    ec2: '🖥️',
    s3: '💾',
    rds: '🗄️',
    lambda: '⚡',
    cloudfront: '🌐',
    elb: '⚖️'
  }

  // Find cheapest option for highlighting
  const cheapestCost = Math.min(...results.map(r => r.monthlycost))
  
  // Calculate total potential savings
  const maxCost = Math.max(...results.map(r => r.monthlycost))
  const totalSavings = maxCost - cheapestCost
  const savingsPercent = maxCost > 0 ? (totalSavings / maxCost) * 100 : 0

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-white">
              💰 Cost Comparison Results
            </h3>
            <p className="text-blue-100 text-sm">
              Compare pricing across {results.length} cloud providers
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="bg-white bg-opacity-20 rounded-lg p-1">
              <button
                onClick={() => setViewMode('overview')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'overview'
                    ? 'bg-white text-blue-600'
                    : 'text-white hover:bg-white hover:bg-opacity-20'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'detailed'
                    ? 'bg-white text-blue-600'
                    : 'text-white hover:bg-white hover:bg-opacity-20'
                }`}
              >
                Detailed
              </button>
            </div>

            {/* Save Button */}
            {isAuthenticated && (
              <button
                onClick={handleSaveComparison}
                disabled={savingComparison}
                className="px-4 py-2 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {savingComparison ? '💾 Saving...' : '💾 Save'}
              </button>
            )}
          </div>
        </div>
        
        {saveSuccess && (
          <div className="mt-2 text-green-200 text-sm font-medium flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Comparison saved successfully!
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              ${cheapestCost.toFixed(2)}
            </div>
            <div className="text-xs text-slate-600">Best Price/month</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              ${maxCost.toFixed(2)}
            </div>
            <div className="text-xs text-slate-600">Highest Price/month</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              ${totalSavings.toFixed(2)}
            </div>
            <div className="text-xs text-slate-600">Potential Savings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {savingsPercent.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-600">Max Savings</div>
          </div>
        </div>
      </div>

      {/* Results Cards */}
      <div className="p-6">
        <div className="grid gap-4">
          {results.map((result, index) => {
            const isLowest = result.monthlycost === cheapestCost
            const services = result.specs?.services || []
            
            return (
              <div
                key={`${result.provider.id}-${index}`}
                className={`rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                  isLowest 
                    ? 'border-green-300 bg-green-50 shadow-md' 
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {/* Provider Logo */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                        result.provider.id === 'aws' 
                          ? 'bg-orange-100 border border-orange-300'
                          : result.provider.id === 'gcp'
                          ? 'bg-blue-100 border border-blue-300'
                          : 'bg-indigo-100 border border-indigo-300'
                      }`}>
                        {result.provider.logo || (
                          result.provider.id === 'aws' ? '☁️' : 
                          result.provider.id === 'gcp' ? '🌩️' : '⚡'
                        )}
                      </div>
                      
                      <div>
                        <h4 className="text-lg font-bold text-slate-700">
                          {result.provider.name}
                        </h4>
                        <p className="text-sm text-slate-500 font-mono">
                          {result.instanceType}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <span className={`text-3xl font-bold ${
                          isLowest ? 'text-green-600' : 'text-slate-700'
                        }`}>
                          ${result.monthlycost.toFixed(2)}
                        </span>
                        {isLowest && (
                          <span className="px-3 py-1 bg-green-200 text-green-800 text-xs font-bold rounded-full">
                            BEST DEAL 🏆
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">/month</p>
                    </div>
                  </div>

                  {/* Services Used */}
                  {services.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-slate-600 mb-2">Services Included:</p>
                      <div className="flex flex-wrap gap-2">
                        {services.map((service: any) => (
                          <span 
                            key={service}
                            className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full"
                          >
                            <span className="mr-1">{serviceIcons[service] || '⚙️'}</span>
                            {service.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cost Breakdown */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">
                        ${result.breakdown.compute.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-600">Compute</div>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">
                        ${result.breakdown.storage.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-600">Storage</div>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <div className="text-lg font-bold text-purple-600">
                        ${result.breakdown.network.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-600">Network</div>
                    </div>
                    {(result.breakdown.database || result.breakdown.serverless) && (
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <div className="text-lg font-bold text-orange-600">
                          ${((result.breakdown.database || 0) + (result.breakdown.serverless || 0)).toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-600">
                          {result.breakdown.database ? 'Database' : 'Serverless'}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Savings Information */}
                  {result.savings && (
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
                      <div className="flex items-start space-x-3">
                        <div className="text-2xl">💡</div>
                        <div>
                          <h5 className="font-semibold text-green-800">
                            Save {result.savings.percentSaved.toFixed(1)}% with {result.savings.alternativeInstance}
                          </h5>
                          <p className="text-sm text-green-700">
                            {result.savings.reason} - Save ${result.savings.monthlySavings.toFixed(2)}/month
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detailed Breakdown (if expanded) */}
                  {viewMode === 'detailed' && expandedRow === index && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg border">
                      <h5 className="font-semibold text-slate-700 mb-3">Detailed Cost Breakdown</h5>
                      {result.detailedBreakdown && (
                        <div className="space-y-2 text-sm">
                          {Object.entries(result.detailedBreakdown).map(([key, value]: [string, any]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-slate-600 capitalize">{key}:</span>
                              <span className="font-mono">
                                {typeof value === 'object' 
                                  ? `$${value.monthlyCost?.toFixed(2) || 'N/A'}`
                                  : `$${value?.toFixed(2) || 'N/A'}`
                                }
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expand/Collapse Button for Detailed View */}
                  {viewMode === 'detailed' && (
                    <button
                      onClick={() => setExpandedRow(expandedRow === index ? null : index)}
                      className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
                    >
                      {expandedRow === index ? '▲ Less Details' : '▼ More Details'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Action Footer */}
      <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
          <div className="text-sm text-slate-600">
            💡 <strong>Pro Tip:</strong> Consider Reserved Instances or Committed Use for additional 20-60% savings
          </div>
          <div className="flex space-x-3">
            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
              📊 Export Report
            </button>
            <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium">
              🚀 Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CostComparisonTable
