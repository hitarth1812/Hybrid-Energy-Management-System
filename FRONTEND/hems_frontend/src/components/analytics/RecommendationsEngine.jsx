import React from 'react';
import { Target, Leaf, IndianRupee, Cpu } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const RecommendationItem = ({ category, text, impact, impactType, priority }) => {
    const getCategoryConfig = (cat) => {
        switch(cat) {
            case 'Efficiency': return { icon: Cpu, color: 'text-blue-400', bg: 'bg-blue-500/10' };
            case 'Cost': return { icon: IndianRupee, color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
            case 'Environmental': return { icon: Leaf, color: 'text-teal-400', bg: 'bg-teal-500/10' };
            default: return { icon: Target, color: 'text-brand', bg: 'bg-brand/10' };
        }
    };

    const config = getCategoryConfig(category);
    const Icon = config.icon;

    return (
        <div className="p-3 bg-surface-base border border-surface-border rounded-lg mb-2 shadow-sm hover:bg-surface-elevated transition-colors cursor-pointer group">
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-1.5">
                    <div className={`p-1 rounded-md ${config.bg} ${config.color}`}>
                        <Icon className="w-3 h-3" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{category}</span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${priority === 'High' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-surface-border text-zinc-400'}`}>
                    {priority} Priority
                </span>
            </div>
            <p className="text-sm text-zinc-300 leading-snug mb-2">{text}</p>
            <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-1">
                Impact: <span className="text-white font-bold">{impact}</span> {impactType}
            </div>
        </div>
    );
};

const RecommendationsEngine = ({ data, isLoading }) => {
    if (isLoading) return <div className="h-[320px] bg-surface-card animate-pulse rounded-2xl border border-surface-border"></div>;

    const recommendations = [
        { id: 1, category: 'Efficiency', text: `Power factor is dropping. Install capacitor bank to correct reactive power.`, impact: formatCurrency(12500), impactType: 'savings/mo', priority: 'High' },
        { id: 2, category: 'Cost', text: `Shift non-essential loads (HVAC stage 2) from 14:00-16:00 to off-peak hours.`, impact: '15%', impactType: 'peak reduction', priority: 'High' },
        { id: 3, category: 'Environmental', text: `High cooling footprint. Increase base temp setpoint by 1°C during weekends.`, impact: '420 kg', impactType: 'CO2 saved', priority: 'Medium' },
    ];

    return (
        <div className="bg-surface-card border border-surface-border p-5 rounded-2xl h-[320px] flex flex-col shadow-lg hover:border-brand/30 transition-colors">
            <h3 className="text-sm font-bold tracking-wide uppercase text-zinc-200 mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-brand-light" /> Action Engine
            </h3>
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
                {recommendations.map(r => (
                    <RecommendationItem key={r.id} {...r} />
                ))}
            </div>
        </div>
    );
};

export default RecommendationsEngine;
