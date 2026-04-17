import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

let logoutHandler = null

export const setLogoutHandler = (handler) => {
  logoutHandler = handler
}

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
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Handle timeout (Render cold start)
    if (error.code === 'ECONNABORTED' || error.message === 'timeout of ' + api.defaults.timeout + 'ms exceeded') {
      console.error('Request timeout - backend may be starting up:', error.message)
      return Promise.reject(new Error('Server is starting up or unreachable. Please try again in a moment.'))
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message)
      return Promise.reject(new Error('Network error. Please check your connection and the API URL: ' + API_BASE_URL))
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
      console.error('API Error:', error.response.data.detail)
      return Promise.reject(new Error(error.response.data.detail))
    }

    if (error.response?.data?.error) {
      console.error('API Error:', error.response.data.error)
      return Promise.reject(new Error(error.response.data.error))
    }

    console.error('Request failed:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    })

    return Promise.reject(error)
  }
)

export default api
