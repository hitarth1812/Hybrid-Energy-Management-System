import React from 'react';
import { Zap, Activity, IndianRupee, Leaf } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';

const ResultCard = ({ title, value, icon: Icon, color, delayClass }) => (
    <div className={`bg-surface-card border border-surface-border p-4 rounded-2xl flex flex-col items-center justify-center text-center fade-in-up ${delayClass} shadow-lg`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${color.bg} ${color.text}`}>
            <Icon className="w-5 h-5" />
        </div>
        <span className="text-xs font-sans uppercase tracking-widest text-zinc-400 mb-1">{title}</span>
        <span className="font-mono text-2xl font-bold text-white tracking-tight">{value}</span>
    </div>
);

const PredictionResultCards = ({ result }) => {
    if (!result) {
        return (
            <div className="h-full min-h-[300px] w-full border border-dashed border-surface-border rounded-2xl flex flex-col items-center justify-center text-zinc-500 p-6 text-center">
                <Zap className="w-8 h-8 mb-4 opacity-20" />
                <p className="font-sans text-sm">Enter parameters and run prediction to view ML forecast results.</p>
            </div>
        );
    }

    const { predicted_kw, status, cost_inr, carbon_kg } = result;

    const statusColors = {
        Normal: { bg: 'bg-green-500/10', text: 'text-green-500' },
        Moderate: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
        High: { bg: 'bg-red-500/10', text: 'text-red-500' }
    };

    return (
        <div className="grid grid-cols-2 gap-4 h-full">
            <ResultCard 
                title="Predicted Load" 
                value={`${formatNumber(predicted_kw)} kW`} 
                icon={Zap} 
                color={{ bg: 'bg-brand/10', text: 'text-brand' }} 
                delayClass="stagger-1" 
            />
            <ResultCard 
                title="System Status" 
                value={status} 
                icon={Activity} 
                color={statusColors[status] || statusColors.Normal} 
                delayClass="stagger-2" 
            />
            <ResultCard 
                title="Est. Hourly Cost" 
                value={formatCurrency(cost_inr)} 
                icon={IndianRupee} 
                color={{ bg: 'bg-yellow-500/10', text: 'text-yellow-500' }} 
                delayClass="stagger-3" 
            />
            <ResultCard 
                title="Carbon Emission" 
                value={`${formatNumber(carbon_kg)} kg`} 
                icon={Leaf} 
                color={{ bg: 'bg-teal-500/10', text: 'text-teal-500' }} 
                delayClass="stagger-4" 
            />
        </div>
    );
};

export default PredictionResultCards;
