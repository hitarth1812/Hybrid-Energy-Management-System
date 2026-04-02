import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-surface-card border border-surface-border p-2 rounded shadow-lg text-xs font-mono">
                <p className="text-zinc-400">Run: {payload[0].payload.run}</p>
                <p className="text-white">Input: <span className="font-bold">{payload[0].value} kW</span></p>
                {payload[1] && <p className="text-brand-light">Predicted: <span className="font-bold">{payload[1].value} kW</span></p>}
            </div>
        );
    }
    return null;
};

const MiniPredictionChart = ({ history }) => {
    if (!history || history.length === 0) {
        return (
            <div className="h-[160px] flex items-center justify-center border border-dashed border-surface-border rounded-xl">
                <span className="text-sm font-sans text-zinc-500 uppercase tracking-widest text-center">No prediction run data</span>
            </div>
        );
    }

    return (
        <div className="h-[160px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <XAxis dataKey="run" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
                    <YAxis hide domain={['dataMin - 10', 'auto']} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#27272a', strokeWidth: 1, strokeDasharray: '3 3' }} />
                    <Line type="monotone" dataKey="input" stroke="#ffffff" strokeWidth={2} dot={{ r: 3, fill: '#fff' }} isAnimationActive={true} />
                    <Line type="monotone" dataKey="predicted" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: '#10b981' }} isAnimationActive={true} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default MiniPredictionChart;
