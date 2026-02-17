import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import GlowingGlobe from './GlowingGlobe'; // Fallback if video missing
import { Zap, Globe, ShieldCheck, Activity } from 'lucide-react';

const CarbonTransition = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [progress, setProgress] = useState(0);
    const [showVideo, setShowVideo] = useState(true);

    useEffect(() => {
        if (isOpen) {
            // Reset state
            setProgress(0);

            // Counter animation
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        return 100;
                    }
                    return prev + Math.floor(Math.random() * 5) + 1;
                });
            }, 50);

            // Navigation timer
            const timer = setTimeout(() => {
                navigate('/carbon');
                // Allow exit animation to play before closing completely
                setTimeout(onClose, 800);
            }, 3500);

            return () => {
                clearTimeout(timer);
                clearInterval(interval);
            };
        }
    }, [isOpen, navigate, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                    transition={{ duration: 0.8 }}
                >
                    {/* Background Layer (Video or Globe) */}
                    <div className="absolute inset-0 z-0 opacity-60">
                        {showVideo ? (
                            <motion.video
                                src="/animations/carbon-globe.mp4"
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                                initial={{ scale: 1, filter: "brightness(0.5)" }}
                                animate={{ scale: 1.1, filter: "brightness(1.2)" }}
                                transition={{ duration: 4, ease: "easeOut" }}
                                onError={() => setShowVideo(false)} // Fallback to Globe component
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-black/90">
                                <div className="w-[800px] h-[800px] relative">
                                    <GlowingGlobe className="opacity-50" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Grid Overlay */}
                    <div className="absolute inset-0 z-10 bg-[linear-gradient(rgba(0,255,100,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,100,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

                    {/* Vignette */}
                    <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,transparent_20%,black_90%)] pointer-events-none" />

                    {/* Content Layer */}
                    <div className="relative z-20 flex flex-col items-center justify-center w-full h-full text-center">

                        {/* Central Logo / Text */}
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, type: "spring" }}
                            className="bg-black/40 backdrop-blur-md border border-emerald-500/30 p-8 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.2)]"
                        >
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                className="w-16 h-16 mx-auto mb-6 text-emerald-500 border-2 border-dashed border-emerald-500/50 rounded-full flex items-center justify-center"
                            >
                                <Globe className="w-8 h-8" />
                            </motion.div>

                            <h1 className="text-4xl md:text-6xl font-black tracking-widest text-white mb-2 font-mono">
                                <span className="text-emerald-500 mr-2">&gt;</span>
                                CARBON_INTEL
                            </h1>
                            <p className="text-emerald-400/80 font-mono text-sm tracking-[0.3em] uppercase">
                                System Initialization
                            </p>
                        </motion.div>

                        {/* Loading Bar & Stats */}
                        <div className="absolute bottom-20 left-0 right-0 px-8 max-w-4xl mx-auto">
                            <div className="flex justify-between items-end mb-2 text-emerald-500 font-mono text-xs">
                                <span className="flex items-center gap-2">
                                    <Activity className="w-3 h-3 animate-pulse" /> NET_ZERO_PROTOCOL
                                </span>
                                <span className="text-xl font-bold">{Math.min(progress, 100)}%</span>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-1 w-full bg-emerald-900/30 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
                                    initial={{ width: "0%" }}
                                    animate={{ width: `${Math.min(progress, 100)}%` }}
                                    transition={{ type: "tween", ease: "linear" }}
                                />
                            </div>

                            {/* Status Indicators */}
                            <div className="grid grid-cols-3 gap-4 mt-4">
                                {['GRID_SYNC', 'EMISSION_TRACKING', 'ESG_REPORTING'].map((item, i) => (
                                    <motion.div
                                        key={item}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: progress > (i * 30 + 20) ? 1 : 0.3 }}
                                        className="flex items-center gap-2 text-[10px] text-emerald-400 font-mono border border-emerald-500/20 bg-emerald-500/5 p-2 rounded"
                                    >
                                        <ShieldCheck className="w-3 h-3" /> {item}...OK
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Scanner Line */}
                        <motion.div
                            className="absolute top-0 left-0 w-full h-[2px] bg-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.5)] z-30"
                            animate={{ top: ["0%", "100%", "0%"] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CarbonTransition;
