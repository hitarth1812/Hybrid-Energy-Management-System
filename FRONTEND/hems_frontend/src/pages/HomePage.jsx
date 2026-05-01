import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import GlowingGlobe from '../components/GlowingGlobe';
import FloatingCard from '../components/FloatingCard';
import SystemTransition from '../components/SystemTransition';
import { BarChart3, Zap, UploadCloud, Globe, Activity, ShieldCheck, Database, Zap as ZapIcon, Fingerprint, Server, FileText } from 'lucide-react';

const HomePage = () => {
    const prefersReducedMotion = useReducedMotion();
    const [transitionConfig, setTransitionConfig] = useState(null);

    const handleTransition = (config) => {
        setTransitionConfig(config);
    };

    return (
        <div className="relative text-gray-900 dark:text-white font-sans selection:bg-green-500/30 w-full h-full flex flex-col justify-center">

            <div className="grid lg:grid-cols-2 gap-4 items-center min-h-[60vh]">

                {/* Text Content */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="space-y-8 pl-8"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs font-medium uppercase tracking-wider shadow-[0_0_10px_rgba(74,222,128,0.2)]">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        Live System Status
                    </div>

                    <h1 className="text-5xl lg:text-7xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">
                        With great <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-600 drop-shadow-sm">Power Consumption</span> Comes Great Responsibility To Report It.
                    </h1>

                    <p className="text-lg text-gray-600 dark:text-white/60 max-w-xl leading-relaxed">
                        Real-time energy management and analytics powered by advanced AI. Visualize your data like never before with ARKA's immersive platform.
                    </p>


                </motion.div>

                {/* 3D Visuals Area — clean layered structure with proper overflow and sizing */}
                <div
                    className="relative w-full max-w-[700px] mx-auto lg:-ml-16 overflow-visible"
                    style={{ height: 750 }}
                >
                    {/* Globe Layer — centered absolute positioning */}
                    <div className="absolute inset-0 flex items-center justify-center z-0">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1, delay: 0.2 }}
                        >
                            <GlowingGlobe globeSize={650} className="opacity-90 dark:mix-blend-plus-lighter" />
                        </motion.div>
                    </div>

                    {/* Floating Cards Layer (Interactive) — absolute on top of the globe */}
                    <div className="absolute inset-0 z-10 pointer-events-none">
                        {/* Card 1: Top Right - Energy */}
                        <motion.div
                            onClick={() => handleTransition({
                                targetRoute: '/energy',
                                transitionIcon: ZapIcon,
                                title: 'ENERGY_CORE',
                                subtitle: 'Power Grid Synchronization',
                                colorClass: 'text-green-500',
                                shadowClass: 'shadow-[0_0_50px_rgba(34,197,94,0.2)]',
                                glowClass: 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]',
                                metrics: [
                                    { label: 'GRID_LINK', icon: ZapIcon },
                                    { label: 'LOAD_BALANCING', icon: Activity },
                                    { label: 'DEVICE_SYNC', icon: Server }
                                ]
                            })}
                            className="absolute top-10 right-10 w-48 pointer-events-auto cursor-pointer"
                            animate={prefersReducedMotion ? {} : { x: [0, 8, 0, -8, 0], y: [0, -6, -10, -6, 0] }}
                            transition={prefersReducedMotion ? {} : { duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <FloatingCard delay={0} depth={1.2}>
                                <div className="p-4 space-y-3 bg-white/80 dark:bg-black/40 backdrop-blur-md rounded-xl border border-gray-200 dark:border-white/10 shadow-lg">
                                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse">
                                        <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Energy Usage</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-2 w-2 relative">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                            </span>
                                            <p className="text-xs text-gray-500 dark:text-white/50">View real-time consumption</p>
                                        </div>
                                    </div>
                                </div>
                            </FloatingCard>
                        </motion.div>

                        {/* Card 2: Bottom Left - Analytics */}
                        <motion.div
                            onClick={() => handleTransition({
                                targetRoute: '/analytics',
                                transitionIcon: BarChart3,
                                title: 'ANALYTICS_ENGINE',
                                subtitle: 'Data Pipeline Initialization',
                                colorClass: 'text-blue-500',
                                shadowClass: 'shadow-[0_0_50px_rgba(59,130,246,0.2)]',
                                glowClass: 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]',
                                metrics: [
                                    { label: 'DATA_STREAM', icon: Database },
                                    { label: 'ML_MODELS', icon: Activity },
                                    { label: 'PATTERN_REC', icon: Fingerprint }
                                ]
                            })}
                            className="absolute bottom-20 left-0 w-56 pointer-events-auto cursor-pointer"
                            animate={prefersReducedMotion ? {} : { x: [0, -10, -16, -10, 0], y: [0, 6, 0, -6, 0] }}
                            transition={prefersReducedMotion ? {} : { duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <FloatingCard delay={1.5} depth={1.5}>
                                <div className="p-4 flex items-center gap-4 bg-white/80 dark:bg-black/40 backdrop-blur-md rounded-xl border border-gray-200 dark:border-white/10 shadow-lg">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center animate-pulse">
                                        <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white/90">Analytics Ready</div>
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-2 w-2 relative">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                            </span>
                                            <div className="text-xs text-gray-500 dark:text-white/50">+24% Efficiency</div>
                                        </div>
                                    </div>
                                </div>
                            </FloatingCard>
                        </motion.div>

                        {/* Card 3: Middle Right - Upload */}
                        <motion.div
                            onClick={() => handleTransition({
                                targetRoute: '/smart-upload',
                                transitionIcon: UploadCloud,
                                title: 'UPLOAD_MATRIX',
                                subtitle: 'Secure Data Transfer',
                                colorClass: 'text-purple-500',
                                shadowClass: 'shadow-[0_0_50px_rgba(168,85,247,0.2)]',
                                glowClass: 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]',
                                metrics: [
                                    { label: 'HANDSHAKE', icon: ShieldCheck },
                                    { label: 'DATA_PARSE', icon: FileText },
                                    { label: 'DB_SYNC', icon: Database }
                                ]
                            })}
                            className="absolute top-1/2 right-4 w-40 opacity-80 pointer-events-auto cursor-pointer"
                            animate={prefersReducedMotion ? {} : { x: [0, 10, 16, 10, 0], y: [0, -4, 0, 4, 0] }}
                            transition={prefersReducedMotion ? {} : { duration: 9, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <FloatingCard delay={0.8} depth={0.5}>
                                <div className="p-3 bg-white/80 dark:bg-black/40 backdrop-blur-md rounded-xl border border-gray-200 dark:border-white/10 shadow-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <UploadCloud className="w-3 h-3 text-purple-600 dark:text-purple-400 animate-pulse" />
                                        <div className="text-xs text-gray-600 dark:text-white/60">Smart Upload</div>
                                    </div>
                                    <div className="h-1 w-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full w-[70%] bg-purple-500/50 animate-pulse" />
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="flex h-2 w-2 relative">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                                        </span>
                                        <div className="text-[10px] text-gray-500 dark:text-white/50">Upload Stream Active</div>
                                    </div>
                                </div>
                            </FloatingCard>
                        </motion.div>
                        {/* Card 4: Top Left - Carbon Intelligence (NEW) */}
                        <motion.div
                            onClick={() => handleTransition({
                                targetRoute: '/carbon',
                                transitionIcon: Globe,
                                title: 'CARBON_INTEL',
                                subtitle: 'System Initialization',
                                colorClass: 'text-emerald-500',
                                shadowClass: 'shadow-[0_0_50px_rgba(16,185,129,0.2)]',
                                glowClass: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]',
                                metrics: [
                                    { label: 'GRID_SYNC', icon: ShieldCheck },
                                    { label: 'EMISSION_TRACKING', icon: Activity },
                                    { label: 'ESG_REPORTING', icon: ShieldCheck }
                                ]
                            })}
                            className="absolute top-10 left-0 w-52 pointer-events-auto cursor-pointer"
                            animate={prefersReducedMotion ? {} : { x: [0, -8, 0, 8, 0], y: [0, -8, -12, -8, 0] }}
                            transition={prefersReducedMotion ? {} : { duration: 11, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <FloatingCard delay={1.0} depth={0.8}>
                                <div className="p-4 space-y-3 bg-white/80 dark:bg-black/40 backdrop-blur-md rounded-xl border border-gray-200 dark:border-white/10 shadow-lg">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse">
                                        <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Carbon Intelligence</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-2 w-2 relative">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                            </span>
                                            <p className="text-xs text-gray-500 dark:text-white/50">Tracking Emissions</p>
                                        </div>
                                    </div>
                                </div>
                            </FloatingCard>
                        </motion.div>
                    </div>
                </div>

                {/* Transition Overlay */}
                {transitionConfig && (
                    <SystemTransition
                        isOpen={!!transitionConfig}
                        onClose={() => setTransitionConfig(null)}
                        {...transitionConfig}
                    />
                )}
            </div>
        </div>
    );
};

export default HomePage;
