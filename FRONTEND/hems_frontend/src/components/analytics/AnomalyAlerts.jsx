import React from 'react';
import { AlertTriangle, Zap, Activity } from 'lucide-react';
import { format } from 'date-fns';

const AnomalyItem = ({ anomaly }) => {
    const getTypeIcon = (type) => {
        switch(type) {
            case 'spike': return <Zap className="w-4 h-4 text-amber-500" />;
            case 'voltage_event': return <Activity className="w-4 h-4 text-red-500" />;
            default: return <AlertTriangle className="w-4 h-4 text-zinc-400" />;
        }
    };

    return (
        <div className="p-3 bg-surface-base border border-surface-border rounded-lg mb-2 relative overflow-hidden group">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500/20 group-hover:bg-red-500/50 transition-colors"></div>
            <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] text-zinc-500 font-mono">{format(new Date(anomaly.timestamp), 'dd MMM HH:mm')}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-elevated border border-surface-border text-red-400">
                    {anomaly.magnitude}
                </span>
            </div>
            <div className="flex items-start gap-2">
                <div className="mt-0.5">{getTypeIcon(anomaly.type)}</div>
                <p className="text-sm text-zinc-300 leading-snug">{anomaly.description}</p>
            </div>
        </div>
    );
};

const AnomalyAlerts = ({ anomalies, isLoading }) => {
    if (isLoading) return <div className="h-[320px] bg-surface-card animate-pulse rounded-2xl border border-surface-border"></div>;

    const hasAnomalies = anomalies && anomalies.length > 0;

    return (
        <div className="bg-surface-card border border-surface-border p-5 rounded-2xl h-[320px] flex flex-col shadow-lg">
            <h3 className="text-sm font-bold tracking-wide uppercase text-zinc-200 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" /> Detected Anomalies
            </h3>
            
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
                {hasAnomalies ? (
                    anomalies.map(a => <AnomalyItem key={a.id} anomaly={a} />)
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                            <span className="text-xl">✅</span>
                        </div>
                        <p className="text-sm text-zinc-400">No anomalies detected in selected period</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnomalyAlerts;
