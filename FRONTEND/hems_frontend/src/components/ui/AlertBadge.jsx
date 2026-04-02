import React, { useState } from 'react';
import { AlertCircle, X, AlertTriangle, CheckCircle } from 'lucide-react';

const icons = {
    Critical: AlertCircle,
    Warning: AlertTriangle,
    Info: CheckCircle
};

const colors = {
    Critical: 'bg-red-500/10 border-red-500/20 text-red-500',
    Warning: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
    Info: 'bg-brand/10 border-brand/20 text-brand'
};

const AlertBadge = ({ type = 'Info', message, dismissable = true }) => {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    const Icon = icons[type];
    const colorClass = colors[type];

    return (
        <div className={`flex items-start gap-3 p-3 rounded-lg border ${colorClass} text-sm font-medium fade-in-up shadow-sm`}>
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug">{message}</div>
            {dismissable && (
                <button onClick={() => setIsVisible(false)} className="opacity-60 hover:opacity-100 transition-opacity p-0.5">
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

export default AlertBadge;
