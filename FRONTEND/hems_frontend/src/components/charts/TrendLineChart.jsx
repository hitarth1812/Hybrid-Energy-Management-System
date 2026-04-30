import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format } from 'date-fns';

const formatTick = (val) => {
    try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return val;
        // If hour is 00:00 and minutes 00, just show date
        if (d.getHours() === 0 && d.getMinutes() === 0) return format(d, 'MMM dd');
        return format(d, 'HH:mm');
    } catch {
        return val;
    }
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-surface-card border border-gray-300 dark:border-surface-border p-3 rounded shadow-xl font-sans text-sm">
                <p className="text-gray-700 dark:text-zinc-400 mb-1">{formatTick(label)}</p>
                <p className="text-white font-mono">
                    <span className="text-brand-light font-bold">{(payload[0].value ?? 0).toFixed(1)}</span> kWh
                </p>
            </div>
        );
    }
    return null;
};

const TrendLineChart = ({ data, isLoading }) => {
    if (isLoading) return <div className="h-[280px] w-full animate-pulse bg-surface-elevated rounded-xl"></div>;

    return (
        <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="timestamp" tickFormatter={formatTick} tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="consumption_kwh" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorConsumption)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TrendLineChart;
