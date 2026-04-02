import React from 'react';
import { Lightbulb, TrendingUp, TrendingDown, Clock, Activity } from 'lucide-react';

const InsightItem = ({ text, severity = 'info' }) => {
    const severityStyles = {
        info: 'border-l-brand/50 text-brand-light',
        warning: 'border-l-amber-500/50 text-amber-500',
        critical: 'border-l-red-500/50 text-red-500'
    };

    const Icon = severity === 'critical' ? Activity : severity === 'warning' ? TrendingUp : Lightbulb;

    return (
        <div className={`flex items-start gap-3 p-3 bg-surface-base border border-surface-border border-l-4 rounded-lg mb-2 shadow-sm ${severityStyles[severity]} transition-colors hover:bg-surface-elevated`}>
            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="text-sm font-sans text-zinc-300 leading-snug">{text}</span>
        </div>
    );
};

const InsightsPanel = ({ data, isLoading }) => {
    if (isLoading) return <div className="h-[320px] bg-surface-card animate-pulse rounded-2xl border border-surface-border"></div>;

    const insights = [
        { id: 1, text: `Usage increased by 14% vs last week, primarily driven by HVAC.`, severity: 'warning' },
        { id: 2, text: `Highest consumption identified consistently at ${data?.peak_hour || '14'}:00.`, severity: 'info' },
        { id: 3, text: `Night-time usage is ${data?.night_usage_pct || 0}% — slightly above the 20% optimal threshold.`, severity: 'warning' },
        { id: 4, text: `Efficiency score maintained above 80/100 threshold for 5 consecutive days.`, severity: 'info' },
        { id: 5, text: `Power factor average is ${data?.pf_avg || 0.9} — action required to reach >0.95.`, severity: 'critical' },
    ];

    return (
        <div className="bg-surface-card border border-surface-border p-5 rounded-2xl h-[320px] flex flex-col shadow-lg">
            <h3 className="text-sm font-bold tracking-wide uppercase text-zinc-200 mb-4 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-brand" /> Smart Insights
            </h3>
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
                {insights.map(i => <InsightItem key={i.id} text={i.text} severity={i.severity} />)}
            </div>
        </div>
    );
};

export default InsightsPanel;
