import React from 'react';
import { cn } from "../lib/utils";

const GlassContainer = ({ children, className, hoverEffect = false }) => {
    return (
        <div
            className={cn(
                "relative backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300",
                hoverEffect && "hover:bg-white/5 hover:border-green-500/30 hover:shadow-[0_0_30px_rgba(34,197,94,0.2)]",
                className
            )}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            {children}
        </div>
    );
};

export default GlassContainer;
