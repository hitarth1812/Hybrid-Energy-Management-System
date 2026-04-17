import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

let logoutHandler = null

export const setLogoutHandler = (handler) => {
  logoutHandler = handler
}

console.log('[HEMS API] Initialized with baseURL:', API_BASE_URL)

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // DEBUG: Log full request details
    const fullUrl = config.baseURL ? `${config.baseURL}${config.url}` : config.url
    console.log('[HEMS API Request]', {
      method: config.method?.toUpperCase(),
      url: fullUrl,
      baseURL: config.baseURL,
      endpoint: config.url,
      hasAuth: !!token,
      timestamp: new Date().toISOString()
    })
    
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => {
    console.log('[HEMS API Response Success]', {
      status: response.status,
      url: response.config.url,
      timestamp: new Date().toISOString()
    })
    return response
  },
  async (error) => {
    const originalRequest = error.config
    const fullUrl = originalRequest?.baseURL ? `${originalRequest.baseURL}${originalRequest.url}` : originalRequest?.url

    // Log all errors with full context
    console.error('[HEMS API Error]', {
      timestamp: new Date().toISOString(),
      method: originalRequest?.method?.toUpperCase(),
      url: fullUrl,
      baseURL: originalRequest?.baseURL,
      endpoint: originalRequest?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers,
      corsHeaders: {
        'Access-Control-Allow-Origin': error.response?.headers?.['access-control-allow-origin'],
        'Access-Control-Allow-Credentials': error.response?.headers?.['access-control-allow-credentials']
      },
      errorCode: error.code,
      errorMessage: error.message,
      responseData: error.response?.data
    })

    // Handle timeout (Render cold start)
    if (error.code === 'ECONNABORTED' || error.message === 'timeout of ' + api.defaults.timeout + 'ms exceeded') {
      console.error('⏱️ Request timeout - backend may be starting up:', error.message)
      return Promise.reject(new Error('Server is starting up or unreachable. Please try again in a moment.'))
    }

    // Handle network errors
    if (!error.response) {
      const corsHint = error.message?.includes('CORS') ? '\n\nCORS Configuration Issue: Backend CORS_ALLOWED_ORIGINS must include your frontend URL.' : ''
      console.error('🌐 Network error:', error.message, corsHint)
      return Promise.reject(new Error(`Network error connecting to ${fullUrl}. ${corsHint ? 'Check browser console for CORS details.' : 'Check your internet connection.'}`))
    }

    // Handle 404 (common issue on production)
    if (error.response?.status === 404) {
      console.warn('❌ 404 Not Found:', {
        requestedUrl: fullUrl,
        baseURL: originalRequest?.baseURL,
        endpoint: originalRequest?.url,
        hint: 'Verify backend route exists and API URL is correct'
      })
    }

    // Handle 403 (likely CORS)
    if (error.response?.status === 403) {
      console.warn('🔒 Forbidden (likely CORS issue):', {
        url: fullUrl,
        corsOrigin: error.response?.headers?.['access-control-allow-origin']
      })
    }

    // Handle 401 Unauthorized with token refresh
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true

      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) {
        if (logoutHandler) logoutHandler()
        return Promise.reject(error)
      }

      try {
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/api/auth/refresh/`,
          { refresh: refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        )

        const newAccess = refreshResponse.data.access
        localStorage.setItem('access_token', newAccess)
        originalRequest.headers.Authorization = `Bearer ${newAccess}`
        return api(originalRequest)
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError.message)
        if (logoutHandler) logoutHandler()
        return Promise.reject(new Error('Session expired. Please login again.'))
      }
    }

    // Handle other errors with better logging
    if (error.response?.data?.detail) {
      console.error('API Error Detail:', error.response.data.detail)
      return Promise.reject(new Error(error.response.data.detail))
    }

    if (error.response?.data?.error) {
      console.error('API Error:', error.response.data.error)
      return Promise.reject(new Error(error.response.data.error))
    }

    return Promise.reject(error)
  }
)

export default api
