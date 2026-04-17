import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import ProtectedRoute from './components/ProtectedRoute'
import { LazyLoader } from './components/LazyLoader'
import ErrorBoundary from './components/ErrorBoundary'

/**
 * LAZY LOADED PAGES - Code splitting for faster initial load
 * These pages are loaded only when their route is accessed
 */

// Public page (loaded eagerly as it's the first page user sees)
import LoginPage from './pages/LoginPage'

// Protected pages (lazy loaded for code splitting)
const HomePage = lazy(() => import('./pages/HomePage').catch(err => {
    console.error('Failed to load HomePage:', err)
    return { default: () => <div>Error loading page</div> }
}))
const Devices = lazy(() => import('./pages/Devices').catch(err => {
    console.error('Failed to load Devices:', err)
    return { default: () => <div>Error loading page</div> }
}))
const EnergyUsage = lazy(() => import('./pages/EnergyUsage').catch(err => {
    console.error('Failed to load EnergyUsage:', err)
    return { default: () => <div>Error loading page</div> }
}))
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard').catch(err => {
    console.error('Failed to load AnalyticsDashboard:', err)
    return { default: () => <div>Error loading page</div> }
}))
const AppliancePrediction = lazy(() => import('./pages/AppliancePrediction').catch(err => {
    console.error('Failed to load AppliancePrediction:', err)
    return { default: () => <div>Error loading page</div> }
}))
const TimeForecast = lazy(() => import('./pages/TimeForecast').catch(err => {
    console.error('Failed to load TimeForecast:', err)
    return { default: () => <div>Error loading page</div> }
}))
const SmartUpload = lazy(() => import('./pages/SmartUpload').catch(err => {
    console.error('Failed to load SmartUpload:', err)
    return { default: () => <div>Error loading page</div> }
}))
const CarbonDashboard = lazy(() => import('./pages/CarbonDashboard').catch(err => {
    console.error('Failed to load CarbonDashboard:', err)
    return { default: () => <div>Error loading page</div> }
}))
const UsageLogForm = lazy(() => import('./pages/UsageLogForm').catch(err => {
    console.error('Failed to load UsageLogForm:', err)
    return { default: () => <div>Error loading page</div> }
}))
const CarbonTargetManager = lazy(() => import('./pages/CarbonTargetManager').catch(err => {
    console.error('Failed to load CarbonTargetManager:', err)
    return { default: () => <div>Error loading page</div> }
}))
const ESGReportPage = lazy(() => import('./pages/ESGReportPage').catch(err => {
    console.error('Failed to load ESGReportPage:', err)
    return { default: () => <div>Error loading page</div> }
}))

export default function App() {
    return (
        <ErrorBoundary>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={(
                    <ProtectedRoute>
                        <MainLayout />
                    </ProtectedRoute>
                )}>
                    <Route index element={
                        <Suspense fallback={<LazyLoader />}>
                            <HomePage />
                        </Suspense>
                    } />
                    <Route path="home" element={
                        <Suspense fallback={<LazyLoader />}>
                            <HomePage />
                        </Suspense>
                    } />
                    <Route path="dashboard" element={
                        <Suspense fallback={<LazyLoader />}>
                            <HomePage />
                        </Suspense>
                    } />
                    <Route path="devices" element={
                        <Suspense fallback={<LazyLoader />}>
                            <Devices />
                        </Suspense>
                    } />
                    <Route path="smart-upload" element={
                        <Suspense fallback={<LazyLoader />}>
                            <SmartUpload />
                        </Suspense>
                    } />
                    <Route path="energy" element={
                        <Suspense fallback={<LazyLoader />}>
                            <EnergyUsage />
                        </Suspense>
                    } />
                    <Route path="analytics" element={
                        <Suspense fallback={<LazyLoader />}>
                            <AnalyticsDashboard />
                        </Suspense>
                    } />
                    <Route path="appliance-prediction" element={
                        <Suspense fallback={<LazyLoader />}>
                            <AppliancePrediction />
                        </Suspense>
                    } />
                    <Route path="time-forecast" element={
                        <Suspense fallback={<LazyLoader />}>
                            <TimeForecast />
                        </Suspense>
                    } />

                    {/* Carbon Intelligence Platform Routes */}
                    <Route path="carbon" element={
                        <Suspense fallback={<LazyLoader />}>
                            <CarbonDashboard />
                        </Suspense>
                    } />
                    <Route path="carbon/log" element={
                        <Suspense fallback={<LazyLoader />}>
                            <UsageLogForm />
                        </Suspense>
                    } />
                    <Route path="carbon/targets" element={
                        <Suspense fallback={<LazyLoader />}>
                            <CarbonTargetManager />
                        </Suspense>
                    } />
                    <Route path="carbon/reports" element={
                        <Suspense fallback={<LazyLoader />}>
                            <ESGReportPage />
                        </Suspense>
                    } />

                    {/* Catch all - redirect to home */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Routes>
        </ErrorBoundary>
    )
}
