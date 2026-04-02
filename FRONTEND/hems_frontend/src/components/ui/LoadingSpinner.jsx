import React from 'react';

const LoadingSpinner = ({ text = "Loading..." }) => {
    return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-4 border-surface-border rounded-full"></div>
                <div className="absolute inset-0 border-4 border-brand rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="font-sans text-sm text-brand-light/70 uppercase tracking-widest">{text}</p>
        </div>
    );
};

export default LoadingSpinner;
