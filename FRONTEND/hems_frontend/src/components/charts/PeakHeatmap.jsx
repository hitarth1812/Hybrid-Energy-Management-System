import React from 'react';

const PeakHeatmap = ({ matrix, isLoading }) => {
    if (isLoading || !matrix) {
        return <div className="h-[200px] w-full animate-pulse bg-surface-elevated rounded-xl"></div>;
    }

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    // Matrix: 7 arrays (days), each 24 elements (hours)
    // Map value to color: 0->emerald-900, 0.4->emerald-400, 0.8->amber-400, 1.0->red-500
    const getColor = (val) => {
        if (val < 0.2) return 'bg-[#022c22]'; // emerald-950
        if (val < 0.4) return 'bg-[#064e3b]'; // emerald-900
        if (val < 0.6) return 'bg-[#10b981]'; // emerald-500
        if (val < 0.8) return 'bg-[#f59e0b]'; // amber-500
        return 'bg-[#ef4444]'; // red-500
    };

    return (
        <div className="w-full">
            <div className="flex">
                {/* Y Axis - Hours (simplified) */}
                <div className="flex flex-col justify-between text-[10px] text-zinc-500 font-mono pr-2 h-[180px] py-1">
                    <span>00:00</span>
                    <span>12:00</span>
                    <span>23:00</span>
                </div>
                
                {/* Grid */}
                <div className="flex-1 flex gap-1 h-[180px]">
                    {matrix.map((dayData, dayIndex) => (
                        <div key={dayIndex} className="flex-1 flex flex-col gap-[2px] group relative">
                            {dayData.map((val, hourIndex) => (
                                <div 
                                    key={hourIndex} 
                                    className={`flex-1 rounded-[1px] ${getColor(val)} transition-transform hover:scale-110 hover:z-10`}
                                    title={`${days[dayIndex]} ${hourIndex.toString().padStart(2, '0')}:00 - Load: ${(val*100).toFixed(0)}%`}
                                ></div>
                            ))}
                            {/* X Axis label */}
                            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-zinc-500 font-mono">
                                {days[dayIndex]}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="mt-8 flex items-center justify-end gap-2 text-xs text-zinc-400 font-sans">
                <span>Low</span>
                <div className="flex gap-1 h-3">
                    <div className="w-4 bg-[#022c22] rounded-sm"></div>
                    <div className="w-4 bg-[#10b981] rounded-sm"></div>
                    <div className="w-4 bg-[#f59e0b] rounded-sm"></div>
                    <div className="w-4 bg-[#ef4444] rounded-sm"></div>
                </div>
                <span>Peak</span>
            </div>
        </div>
    );
};

export default PeakHeatmap;
