import React, { useState } from 'react';
import { calculateApparentPower, calculateReactivePower, calculateLoadFactor } from '../../utils/energyCalculations';
import { ChevronDown, ChevronUp, Calculator } from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

const ComputedFeatures = ({ formData }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Only compute if we have enough data
    const p = parseFloat(formData.power);
    const pf = parseFloat(formData.power_factor);
    const vln = parseFloat(formData.VLN);
    const curr = parseFloat(formData.current);

    const hasData = !isNaN(p) && !isNaN(pf) && !isNaN(vln) && !isNaN(curr);

    const apparentPower = hasData ? calculateApparentPower(p, pf) : 0;
    const reactivePower = hasData ? calculateReactivePower(apparentPower, p) : 0;
    const loadFactor = hasData ? calculateLoadFactor(p, vln, curr) : 0;
    const energyPerHour = hasData ? p * 1 : 0;

    return (
        <div className="w-full bg-gray-100 dark:bg-surface-elevated border border-gray-300 dark:border-surface-border rounded-xl mt-6 overflow-hidden transition-all duration-300 shadow-sm">
            <button 
                onClick={() => setIsExpanded(!isExpanded)} 
                className="w-full p-4 flex items-center justify-between text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-surface-border/30 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-emerald-600 dark:text-brand" />
                    <span className="font-sans text-sm font-semibold tracking-wide">Computed Electrical Features</span>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {isExpanded && (
                <div className="p-4 border-t border-gray-300 dark:border-surface-border bg-white dark:bg-surface-card grid grid-cols-2 md:grid-cols-4 gap-4 animate-accordion-down">
                    <div className="p-3 bg-gray-50 dark:bg-surface-base rounded-lg border border-gray-200 dark:border-surface-border/50">
                        <div className="text-[10px] text-gray-600 dark:text-zinc-500 uppercase tracking-widest font-sans mb-1">Apparent Power</div>
                        <div className="font-mono text-lg text-gray-900 dark:text-white">{formatNumber(apparentPower)} <span className="text-xs text-gray-500 dark:text-zinc-400">kVA</span></div>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-surface-base rounded-lg border border-gray-200 dark:border-surface-border/50">
                        <div className="text-[10px] text-gray-600 dark:text-zinc-500 uppercase tracking-widest font-sans mb-1">Reactive Power</div>
                        <div className="font-mono text-lg text-gray-900 dark:text-white">{formatNumber(reactivePower)} <span className="text-xs text-gray-500 dark:text-zinc-400">kVAR</span></div>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-surface-base rounded-lg border border-gray-200 dark:border-surface-border/50">
                        <div className="text-[10px] text-gray-600 dark:text-zinc-500 uppercase tracking-widest font-sans mb-1">Load Factor</div>
                        <div className="font-mono text-lg text-gray-900 dark:text-white">{formatNumber(loadFactor, 2)} <span className="text-xs text-gray-500 dark:text-zinc-400">ratio</span></div>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-surface-base rounded-lg border border-gray-200 dark:border-surface-border/50">
                        <div className="text-[10px] text-gray-600 dark:text-zinc-500 uppercase tracking-widest font-sans mb-1">Energy Snapshot</div>
                        <div className="font-mono text-lg text-emerald-600 dark:text-brand-light">{formatNumber(energyPerHour)} <span className="text-xs text-emerald-600/60 dark:text-brand-light/60">kWh/hr</span></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComputedFeatures;
