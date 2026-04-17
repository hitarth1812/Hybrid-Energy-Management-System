/**
 * HEMS Login Diagnostics Tool
 * Run this in browser console to debug login issues
 */

export const runDiagnostics = async () => {
  console.clear()
  console.log('='.repeat(50))
  console.log('🔍 HEMS PRODUCTION LOGIN DIAGNOSTICS')
  console.log('='.repeat(50))

  const diagnostics = {
    environment: {},
    connectivity: {},
    endpoints: {},
    cors: {},
    storage: {},
    results: []
  }

  // 1. Check Environment Configuration
  console.log('\n[1/5] ENVIRONMENT CONFIGURATION')
  console.log('-'.repeat(50))
  
  const apiUrl = import.meta.env.VITE_API_URL
  diagnostics.environment = {
    VITE_API_URL: apiUrl || '(NOT SET - using localhost fallback)',
    NODE_ENV: import.meta.env.MODE,
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD
  }
  
  console.table(diagnostics.environment)
  
  if (!apiUrl) {
    diagnostics.results.push({
      level: '⚠️ WARNING',
      message: 'VITE_API_URL not set in .env - using localhost fallback'
    })
  }

  // 2. Test Connectivity to Backend
  console.log('\n[2/5] BACKEND CONNECTIVITY')
  console.log('-'.repeat(50))
  
  const baseUrl = apiUrl || 'http://localhost:8000'
  const healthUrl = `${baseUrl}/api/health/`
  
  console.log('Testing connectivity to:', healthUrl)
  
  try {
    const healthResponse = await fetch(healthUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    
    diagnostics.connectivity = {
      endpoint: healthUrl,
      status: healthResponse.status,
      statusText: healthResponse.statusText,
      ok: healthResponse.ok,
      headers: {
        'content-type': healthResponse.headers.get('content-type'),
        'access-control-allow-origin': healthResponse.headers.get('access-control-allow-origin'),
        'access-control-allow-credentials': healthResponse.headers.get('access-control-allow-credentials')
      }
    }
    
    console.table(diagnostics.connectivity)
    
    if (healthResponse.ok) {
      diagnostics.results.push({
        level: '✅ SUCCESS',
        message: 'Backend is reachable and responding'
      })
    } else if (healthResponse.status === 404) {
      diagnostics.results.push({
        level: '❌ ERROR',
        message: `Health check endpoint returned 404. Backend URL may be incorrect: ${baseUrl}`
      })
    }
  } catch (error) {
    console.error('Connectivity test failed:', error)
    diagnostics.results.push({
      level: '❌ ERROR',
      message: `Cannot reach backend. Error: ${error.message}`
    })
  }

  // 3. Check Login Endpoint
  console.log('\n[3/5] LOGIN ENDPOINT')
  console.log('-'.repeat(50))
  
  const loginUrl = `${baseUrl}/api/auth/login/`
  console.log('Testing endpoint:', loginUrl)
  
  try {
    const loginResponse = await fetch(loginUrl, {
      method: 'OPTIONS', // Check CORS preflight
      headers: {
        'Content-Type': 'application/json',
        'Origin': window.location.origin
      }
    })
    
    diagnostics.endpoints.login = {
      url: loginUrl,
      corsStatus: loginResponse.status,
      corsHeaders: {
        'Access-Control-Allow-Origin': loginResponse.headers.get('access-control-allow-origin'),
        'Access-Control-Allow-Methods': loginResponse.headers.get('access-control-allow-methods'),
        'Access-Control-Allow-Credentials': loginResponse.headers.get('access-control-allow-credentials')
      }
    }
    
    console.table(diagnostics.endpoints.login)
  } catch (error) {
    console.error('Endpoint test failed:', error)
    diagnostics.endpoints.login = {
      error: error.message
    }
  }

  // 4. Check CORS Configuration
  console.log('\n[4/5] CORS CONFIGURATION')
  console.log('-'.repeat(50))
  
  diagnostics.cors = {
    currentOrigin: window.location.origin,
    currentUrl: window.location.href,
    expectedBackendOrigin: baseUrl
  }
  
  console.table(diagnostics.cors)
  
  if (!baseUrl.includes(window.location.hostname) && baseUrl !== 'http://localhost:8000') {
    diagnostics.results.push({
      level: '⚠️ NOTICE',
      message: 'Cross-origin request detected. Backend must have CORS enabled for: ' + window.location.origin
    })
  }

  // 5. Check Local Storage
  console.log('\n[5/5] LOCAL STORAGE')
  console.log('-'.repeat(50))
  
  diagnostics.storage = {
    hasAccessToken: !!localStorage.getItem('access_token'),
    hasRefreshToken: !!localStorage.getItem('refresh_token'),
    tokens: {
      accessToken: localStorage.getItem('access_token')?.substring(0, 20) + '...',
      refreshToken: localStorage.getItem('refresh_token')?.substring(0, 20) + '...'
    }
  }
  
  console.table(diagnostics.storage)

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📋 DIAGNOSTIC SUMMARY')
  console.log('='.repeat(50))
  
  diagnostics.results.forEach(result => {
    console.log(`${result.level} ${result.message}`)
  })

  // Quick Fix Guide
  console.log('\n' + '='.repeat(50))
  console.log('🛠️  QUICK FIX GUIDE')
  console.log('='.repeat(50))
  
  console.log(`
1. VERIFY API URL:
   Current: ${apiUrl || 'NOT SET (localhost fallback)'}
   Should be: https://hems-backend.onrender.com (production)
   Check: FRONTEND/.env.production file

2. VERIFY BACKEND CORS:
   Backend must have your frontend URL in CORS_ALLOWED_ORIGINS
   Add to Render Environment Variables:
   CORS_ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app,https://your-netlify-domain.netlify.app

3. VERIFY ENDPOINTS:
   Frontend expects: POST /api/auth/login/
   Backend provides: ✓ Configured in urls.py

4. CHECK BROWSER CONSOLE:
   Look for [HEMS API Request] and [HEMS API Error] logs
   These show exact request URLs and error details

5. TEST CREDENTIALS:
   Username: admin
   Password: admin123
  `)

  console.log('='.repeat(50))
  console.log('✨ Diagnostics complete. Check console logs above for issues.')
  console.log('='.repeat(50))
  
  return diagnostics
}

// Export a function to check if we're in production
export const isProduction = () => import.meta.env.PROD

// Export API URL getter
export const getApiUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:8000'
