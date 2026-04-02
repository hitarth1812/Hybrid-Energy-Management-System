import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-surface-card border border-surface-border p-3 rounded shadow-xl font-sans text-sm">
                <p className="text-zinc-400 mb-1">{label}</p>
                <p className="text-white font-mono">
                    <span className="text-teal-400 font-bold">{payload[0].value.toFixed(1)}</span> kg CO₂
                </p>
            </div>
        );
    }
    return null;
};

const CO2TrendChart = ({ data, isLoading }) => {
    if (isLoading) return <div className="h-[250px] w-full animate-pulse bg-surface-elevated rounded-xl"></div>;

    return (
        <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorCO2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="timestamp" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="co2_kg" stroke="#14b8a6" strokeWidth={2} fillOpacity={1} fill="url(#colorCO2)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default CO2TrendChart;
