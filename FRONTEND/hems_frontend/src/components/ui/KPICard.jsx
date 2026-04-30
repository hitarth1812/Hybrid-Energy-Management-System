import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const KPICard = ({ title, value, unit, icon: Icon, trend, trendDirection }) => {
    return (
        <div className="min-w-[240px] flex-1 bg-white/70 dark:bg-surface-card border border-gray-300 dark:border-surface-border p-5 rounded-2xl shadow-lg flex flex-col justify-between hover:bg-white dark:hover:bg-surface-elevated transition-colors">
            <div className="flex items-center justify-between mb-4">
                <span className="font-sans text-xs uppercase tracking-widest text-emerald-700 dark:text-brand-light/60">{title}</span>
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 dark:bg-brand-glow flex items-center justify-center">
                    {Icon && <Icon className="w-4 h-4 text-emerald-600 dark:text-brand-light" />}
                </div>
            </div>
            
            <div className="flex items-end gap-2">
                <h3 className="font-mono text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">{value}</h3>
                {unit && <span className="text-gray-500 dark:text-zinc-400 mb-1 text-sm font-medium">{unit}</span>}
            </div>

            {trend && (
                <div className={`mt-3 flex items-center gap-1 text-xs font-semibold ${trendDirection === 'up' ? (title.includes('Efficiency') ? 'text-emerald-600 dark:text-brand' : 'text-red-500 dark:text-red-400') : (title.includes('Efficiency') ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-brand')}`}>
                    {trendDirection === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    <span>{trend}</span>
                </div>
            )}
        </div>
    );
};

export default KPICard;
