import axios from 'axios'
import { ResourceSpecs, PricingResult, CostComparison, User, ApiResponse } from '../types'

// Base API configuration
// Using environment variable for API URL - learned this from 12-factor app principles
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds - cost calculations can take a while
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle common response patterns
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Quick hack to handle common error cases
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Cost calculation API calls
export const calculateCosts = async (specs: ResourceSpecs): Promise<ApiResponse<PricingResult[]>> => {
  try {
    const response = await apiClient.post('/calculate-costs', specs)
    return response.data
  } catch (error) {
    // console.error('API Error - calculateCosts:', error) // debug line
    if (axios.isAxiosError(error) && error.response) {
      return {
        success: false,
        error: error.response.data?.error || 'Failed to calculate costs'
      }
    }
    return {
      success: false,
      error: 'Network error - please check your connection'
    }
  }
}

// Get cached pricing data
export const getPricingData = async (provider?: string, region?: string): Promise<ApiResponse<any>> => {
  try {
    const params = new URLSearchParams()
    if (provider) params.append('provider', provider)
    if (region) params.append('region', region)
    
    const response = await apiClient.get(`/pricing-data?${params.toString()}`)
    return response.data
  } catch (error) {
    return {
      success: false,
      error: 'Failed to fetch pricing data'
    }
  }
}

// Save cost comparison
export const saveComparison = async (comparison: Omit<CostComparison, 'id' | 'userId' | 'createdAt'>): Promise<ApiResponse<CostComparison>> => {
  try {
    const response = await apiClient.post('/save-comparison', comparison)
    return response.data
  } catch (error) {
    return {
      success: false,
      error: 'Failed to save comparison'
    }
  }
}

// Get user's saved comparisons
export const getUserComparisons = async (): Promise<ApiResponse<CostComparison[]>> => {
  try {
    const response = await apiClient.get('/user/comparisons')
    return response.data
  } catch (error) {
    return {
      success: false,
      error: 'Failed to fetch your comparisons'
    }
  }
}

// Authentication API calls
export const login = async (email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> => {
  try {
    const response = await apiClient.post('/auth/login', { email, password })
    
    if (response.data.success && response.data.data?.token) {
      // Store token for future requests
      localStorage.setItem('authToken', response.data.data.token)
    }
    
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return {
        success: false,
        error: error.response.data?.error || 'Login failed'
      }
    }
    return {
      success: false,
      error: 'Network error during login'
    }
  }
}

export const register = async (userData: {
  email: string
  password: string
  firstName: string
  lastName: string
}): Promise<ApiResponse<{ user: User; token: string }>> => {
  try {
    const response = await apiClient.post('/auth/register', userData)
    
    if (response.data.success && response.data.data?.token) {
      localStorage.setItem('authToken', response.data.data.token)
    }
    
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return {
        success: false,
        error: error.response.data?.error || 'Registration failed'
      }
    }
    return {
      success: false,
      error: 'Network error during registration'
    }
  }
}

export const logout = async (): Promise<void> => {
  try {
    await apiClient.post('/auth/logout')
  } catch (error) {
    // Logout on frontend regardless of backend response
    // console.log('Logout API call failed, but continuing with local logout')
  } finally {
    localStorage.removeItem('authToken')
  }
}

// User profile management
export const getUserProfile = async (): Promise<ApiResponse<User>> => {
  try {
    const response = await apiClient.get('/user/profile')
    return response.data
  } catch (error) {
    return {
      success: false,
      error: 'Failed to fetch profile'
    }
  }
}

export const updateUserProfile = async (updates: Partial<User>): Promise<ApiResponse<User>> => {
  try {
    const response = await apiClient.put('/user/profile', updates)
    return response.data
  } catch (error) {
    return {
      success: false,
      error: 'Failed to update profile'
    }
  }
}

// Health check - useful for monitoring
export const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await apiClient.get('/health')
    return response.status === 200
  } catch (error) {
    return false
  }
}
