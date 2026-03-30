import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import EnergyUsage from './pages/EnergyUsage';
import TimeForecast from './pages/TimeForecast';
import SmartUpload from './pages/SmartUpload';
import CarbonDashboard from './pages/CarbonDashboard';
import UsageLogForm from './pages/UsageLogForm';
import CarbonTargetManager from './pages/CarbonTargetManager';
import ESGReportPage from './pages/ESGReportPage';
import ErrorBoundary from './components/ErrorBoundary';

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
          <Route index element={<HomePage />} />
          <Route path="home" element={<HomePage />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="devices" element={<Devices />} />
          <Route path="smart-upload" element={<SmartUpload />} />
          <Route path="energy" element={<EnergyUsage />} />
          <Route path="time-forecast" element={<TimeForecast />} />

          {/* Carbon Intelligence Platform Routes */}
          <Route path="carbon" element={<CarbonDashboard />} />
          <Route path="carbon/log" element={<UsageLogForm />} />
          <Route path="carbon/targets" element={<CarbonTargetManager />} />
          <Route path="carbon/reports" element={<ESGReportPage />} />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
