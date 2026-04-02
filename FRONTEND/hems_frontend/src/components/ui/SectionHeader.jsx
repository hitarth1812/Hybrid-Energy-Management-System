import React from 'react';

const SectionHeader = ({ title, subtitle, rightElement }) => {
    return (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-4 border-b border-surface-border">
            <div>
                <h2 className="font-mono text-2xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand to-brand-light font-bold">
                    {title}
                </h2>
                {subtitle && (
                    <p className="font-sans text-sm text-zinc-400 mt-1">{subtitle}</p>
                )}
            </div>
            {rightElement && (
                <div className="flex items-center gap-2">
                    {rightElement}
                </div>
            )}
        </div>
    );
};

export default SectionHeader;
