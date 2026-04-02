import React from 'react';
import { ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import { format } from 'date-fns';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const isPeak = payload[0].payload.is_peak;
        return (
            <div className="bg-surface-card border border-surface-border p-3 rounded shadow-xl font-sans text-sm">
                <p className="text-zinc-400 mb-2">{format(new Date(label), 'PPp')}</p>
                {payload[0].value !== null && (
                    <p className="text-white">Actual: <span className="font-mono font-bold">{payload[0].value} kWh</span></p>
                )}
                {payload[1] && (
                    <p className="text-brand-light">Predicted: <span className="font-mono font-bold">{payload[1].value} kWh</span></p>
                )}
                {isPeak && <p className="text-red-400 mt-1 font-bold text-xs uppercase tracking-widest">⚠️ Peak detected</p>}
            </div>
        );
    }
    return null;
};

const ForecastChart = ({ data, isLoading }) => {
    if (isLoading) return <div className="h-[300px] w-full animate-pulse bg-surface-elevated rounded-xl"></div>;

    // Check if we hold a peak segment
    const hasPeak = data?.some(d => d.is_peak);

    return (
        <div className="relative h-[300px] w-full">
            {hasPeak && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                    ⚠️ Peak Load Forecasted Ahead
                </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                    <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(val) => format(new Date(val), 'HH:mm')}
                        tick={{ fontSize: 11, fill: '#71717a' }} 
                        axisLine={false} 
                        tickLine={false} 
                        minTickGap={30}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Line type="monotone" dataKey="actual_kwh" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={true} />
                    <Line type="monotone" dataKey="predicted_kwh" stroke="#34d399" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={true} />
                    
                    {data && data.map((entry, index) => 
                        entry.is_peak ? (
                            <ReferenceDot key={`peak-${index}`} x={entry.timestamp} y={entry.predicted_kwh} r={4} fill="#ef4444" stroke="none" />
                        ) : null
                    )}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ForecastChart;
