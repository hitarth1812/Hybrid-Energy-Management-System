import React, { useState } from 'react';
import SectionHeader from '../components/ui/SectionHeader';
import KPICard from '../components/ui/KPICard';
import TrendLineChart from '../components/charts/TrendLineChart';
import ForecastChart from '../components/charts/ForecastChart';
import InsightsPanel from '../components/analytics/InsightsPanel';
import AnomalyAlerts from '../components/analytics/AnomalyAlerts';
import RecommendationsEngine from '../components/analytics/RecommendationsEngine';
import CarbonIntelligence from '../components/analytics/CarbonIntelligence';
import PeakHeatmap from '../components/charts/PeakHeatmap';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Link } from 'react-router-dom';
import api from '../utils/axiosInstance';

import { useAnalytics } from '../hooks/useAnalytics';
import { useForecast } from '../hooks/useForecast';
import { Zap, IndianRupee, Leaf, Activity, ArrowUp, FileText } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/formatters';

const AnalyticsDashboard = () => {
    const [isDownloadingReport, setIsDownloadingReport] = useState(false);
    const { data: analyticsData, isLoading: isAnalyticsLoading, granularity, setGranularity, selectedDate, setSelectedDate } = useAnalytics('daily');
    const { forecast: forecastData, isLoading: isForecastLoading } = useForecast(72);

    const downloadPowerReport = async (type = 'power') => {
        setIsDownloadingReport(true);
        try {
            const res = await api.get(`/api/energy/report/?type=${type}`, { responseType: 'blob' });
            const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `power_prediction_report_${type}_${new Date().toISOString().slice(0, 10)}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download Power report:', err);
        } finally {
            setIsDownloadingReport(false);
        }
    };


    if (isAnalyticsLoading && !analyticsData) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <LoadingSpinner text="Gathering Intelligence..." />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 fade-in-up pb-20">
            <SectionHeader 
                title="Energy Intelligence" 
                subtitle={`Live telemetry analysis running. Last update: ${new Date().toLocaleTimeString()}`}
            />

            {/* ESG Report Lab Quick Access */}
            <div className="bg-surface-card border border-surface-border rounded-2xl p-4 md:p-5 shadow-lg mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-brand/15 text-brand">
                        <FileText size={18} />
                    </div>
                    <div>
                        <h3 className="text-white font-bold tracking-wide">ESG PDF Report Generator</h3>
                        <p className="text-sm text-zinc-400">
                            Open Report Lab to generate and download monthly ESG PDFs for selected buildings.
                        </p>
                    </div>
                </div>
                <Link
                    to="/carbon/reports"
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-brand/20 border border-brand/40 text-brand font-semibold hover:bg-brand/30 transition-colors"
                >
                    Open Report Lab
                </Link>
                <div className="flex gap-2">
                    <button
                        onClick={() => downloadPowerReport('power')}
                        disabled={isDownloadingReport}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 font-semibold hover:bg-indigo-500/30 disabled:opacity-60 transition-colors"
                    >
                        Download Power Prediction PDF
                    </button>
                </div>
            </div>

            {/* KPI Cards Row */}
            <div className="flex gap-4 overflow-x-auto pb-4 mb-4 scrollbar-hide">
                <KPICard 
                    title="Total Consumption" 
                    value={formatNumber(analyticsData?.total_kwh || 0)} 
                    unit="kWh" 
                    icon={Zap} 
                    trend="+12%" 
                    trendDirection="up" 
                />
                <KPICard 
                    title="Estimated Cost" 
                    value={formatCurrency(analyticsData?.total_cost_inr || 0)} 
                    icon={IndianRupee} 
                    trend="-2.4%" 
                    trendDirection="down" 
                />
                <KPICard 
                    title="Carbon Emissions" 
                    value={formatNumber(analyticsData?.total_co2_kg || 0)} 
                    unit="kg CO₂" 
                    icon={Leaf} 
                    trend="-5.1%" 
                    trendDirection="down" 
                />
                <KPICard 
                    title="Efficiency Score" 
                    value={analyticsData?.efficiency_score || 0} 
                    unit="/ 100" 
                    icon={Activity} 
                    trend="+3 pts" 
                    trendDirection="up" 
                />
                <KPICard 
                    title="Peak Demand" 
                    value={formatNumber(analyticsData?.peak_demand_kw || 0)} 
                    unit="kW" 
                    icon={ArrowUp} 
                    trend={`@ ${analyticsData?.peak_hour || 14}:00`} 
                    trendDirection="neutral" 
                />
            </div>

            {/* Trends Section */}
            <div className="bg-surface-card border border-surface-border rounded-2xl p-6 shadow-lg mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h3 className="font-bold text-white tracking-wide">Historical Consumption Trend</h3>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input 
                            type="date"
                            value={selectedDate}
                            onChange={(e) => {
                                setSelectedDate(e.target.value);
                                if (e.target.value) {
                                    setGranularity('hourly');
                                } else {
                                    setGranularity('daily'); // Reset when date cleared
                                }
                            }}
                            className="bg-surface-base text-zinc-300 border border-surface-border rounded-md px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand hover:border-brand/50 transition-colors"
                        />
                        <div className="flex bg-surface-base p-1 rounded-lg border border-surface-border">
                            {['hourly', 'daily', 'weekly'].map(gran => (
                                <button
                                    key={gran}
                                    onClick={() => setGranularity(gran)}
                                    className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-colors ${granularity === gran ? 'bg-brand/20 text-brand' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    {gran}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <TrendLineChart data={analyticsData?.consumption_series} isLoading={isAnalyticsLoading} />
            </div>

            {/* Forecasting Section */}
            <div className="bg-surface-card border border-surface-border rounded-2xl p-6 shadow-lg mb-8 relative">
                <h3 className="font-bold text-white tracking-wide mb-6">72-Hour Load Forecast & Peak Detection</h3>
                <ForecastChart data={forecastData} isLoading={isForecastLoading} />
            </div>

            {/* 3-Column Intelligence Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <InsightsPanel data={analyticsData} isLoading={isAnalyticsLoading} />
                <AnomalyAlerts anomalies={analyticsData?.anomalies} isLoading={isAnalyticsLoading} />
                <RecommendationsEngine data={analyticsData} isLoading={isAnalyticsLoading} />
            </div>

            {/* Peak Heatmap Section */}
            <div className="bg-surface-card border border-surface-border bg-gradient-to-br from-surface-card to-surface-elevated rounded-2xl p-6 shadow-lg mb-8">
                <h3 className="font-bold text-white tracking-wide mb-2">Weekly Peak Load Heatmap</h3>
                <p className="text-sm text-zinc-400 mb-6">Identifying temporal concentration of systemic energy demand</p>
                <PeakHeatmap matrix={analyticsData?.heatmap_matrix} isLoading={isAnalyticsLoading} />
            </div>

            {/* Carbon Intelligence */}
            <h3 className="text-xl font-bold font-mono text-brand mb-4 px-2 tracking-tight">Environmental Impact</h3>
            <CarbonIntelligence co2Amount={analyticsData?.total_co2_kg} series={analyticsData?.co2_series} isLoading={isAnalyticsLoading} />

        </div>
    );
};

export default AnalyticsDashboard;
