import React from 'react';
import CO2TrendChart from '../charts/CO2TrendChart';
import { TreePine, Car, Plane } from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

const MetricCard = ({ icon: Icon, value, label, subtext, colorClass }) => (
    <div className={`p-4 bg-surface-base border border-surface-border rounded-xl flex items-center gap-4 hover:bg-surface-elevated transition-colors shadow-sm`}>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorClass.bg} ${colorClass.text}`}>
            <Icon className="w-6 h-6" />
        </div>
        <div>
            <div className="flex items-baseline gap-1">
                <span className="font-mono text-2xl font-bold text-white tracking-tight">{value}</span>
            </div>
            <p className="text-sm font-medium text-zinc-300">{label}</p>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-0.5">{subtext}</p>
        </div>
    </div>
);

const CarbonIntelligence = ({ co2Amount, series, isLoading }) => {
    // Equivalent computations
    const trees = co2Amount ? Math.round(co2Amount / 21) : 0;
    const carKm = co2Amount ? Math.round(co2Amount / 0.21) : 0;
    const flights = co2Amount ? Math.round(co2Amount / 255) : 0;

    return (
        <div className="bg-surface-card border border-surface-border rounded-2xl shadow-lg mt-6 overflow-hidden">
            <div className="flex flex-col lg:flex-row">
                <div className="lg:w-[60%] p-6 border-b lg:border-b-0 lg:border-r border-surface-border">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <LeafIcon /> Carbon Footprint Trend
                            </h3>
                            <p className="text-xs text-zinc-400 mt-1">Total CO₂ emissions over selected period</p>
                        </div>
                        <div className="text-right">
                            <span className="font-mono text-xl font-bold text-teal-400">{formatNumber(co2Amount)}</span>
                            <span className="text-zinc-500 text-sm ml-1">kg</span>
                        </div>
                    </div>
                    <CO2TrendChart data={series} isLoading={isLoading} />
                </div>
                
                <div className="lg:w-[40%] p-6 bg-surface-base">
                    <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-6">Environmental impact equivalent</h3>
                    <div className="space-y-4">
                        <MetricCard 
                            icon={TreePine} 
                            value={formatNumber(trees, 0)} 
                            label="Mature Trees Needed" 
                            subtext="To offset annual emissions"
                            colorClass={{ bg: 'bg-emerald-500/10', text: 'text-emerald-500' }}
                        />
                        <MetricCard 
                            icon={Car} 
                            value={formatNumber(carKm, 0)} 
                            label="Car Kilometers" 
                            subtext="Average petrol car offset"
                            colorClass={{ bg: 'bg-amber-500/10', text: 'text-amber-500' }}
                        />
                        <MetricCard 
                            icon={Plane} 
                            value={formatNumber(flights, 0)} 
                            label="Short-haul Flights" 
                            subtext="Passenger journey offset"
                            colorClass={{ bg: 'bg-blue-500/10', text: 'text-blue-500' }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

const LeafIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-500">
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
    </svg>
);

export default CarbonIntelligence;
