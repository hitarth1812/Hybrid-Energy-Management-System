import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import GlowingGlobe from '../components/GlowingGlobe';
import FloatingCard from '../components/FloatingCard';
import CarbonTransition from '../components/CarbonTransition';
import { ArrowRight, BarChart3, Zap, UploadCloud, Globe, Shield } from 'lucide-react';

const HomePage = () => {
    const navigate = useNavigate();
    const [showCarbonTransition, setShowCarbonTransition] = useState(false);

    return (
        <div className="relative text-gray-900 dark:text-white font-sans selection:bg-green-500/30 w-full h-full flex flex-col justify-center">

            <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[60vh]">

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
                        Turn Every <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-600 drop-shadow-sm">User Insight</span> Into Your Next Big Feature.
                    </h1>

                    <p className="text-lg text-gray-600 dark:text-white/60 max-w-xl leading-relaxed">
                        Real-time energy management and analytics powered by advanced AI. Visualize your data like never before with ARKA's immersive platform.
                    </p>

                    <div className="flex flex-wrap items-center gap-4">
                        <button onClick={() => navigate('/dashboard')} className="group relative px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_40px_rgba(34,197,94,0.5)] overflow-hidden">
                            <span className="relative z-10 flex items-center gap-2">
                                Launch Dashboard <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 -translate-x-full group-hover:animate-shimmer" />
                        </button>
                    </div>
                </motion.div>

                {/* 3D Visuals Area */}
                <div className="relative h-[600px] w-full flex items-center justify-center perspective-1000">
                    {/* Globe Layer */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="absolute inset-0 flex items-center justify-center z-0"
                    >
                        <GlowingGlobe className="opacity-80 mix-blend-multiply dark:mix-blend-plus-lighter" />
                    </motion.div>

                    {/* Floating Cards Layer (Interactive) */}
                    <div className="absolute inset-0 z-10 pointer-events-none">
                        {/* Card 1: Top Right - Energy */}
                        <div onClick={() => navigate('/energy')} className="absolute top-10 right-10 w-48 pointer-events-auto cursor-pointer">
                            <FloatingCard delay={0} depth={1.2}>
                                <div className="p-4 space-y-3 bg-white/80 dark:bg-black/40 backdrop-blur-md rounded-xl border border-gray-200 dark:border-white/10 shadow-lg">
                                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                        <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Energy Usage</h3>
                                        <p className="text-xs text-gray-500 dark:text-white/50">View real-time consumption</p>
                                    </div>
                                </div>
                            </FloatingCard>
                        </div>

                        {/* Card 2: Bottom Left - Analytics */}
                        <div onClick={() => navigate('/dashboard')} className="absolute bottom-20 left-0 w-56 pointer-events-auto cursor-pointer">
                            <FloatingCard delay={1.5} depth={1.5}>
                                <div className="p-4 flex items-center gap-4 bg-white/80 dark:bg-black/40 backdrop-blur-md rounded-xl border border-gray-200 dark:border-white/10 shadow-lg">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                        <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white/90">Analytics Ready</div>
                                        <div className="text-xs text-gray-500 dark:text-white/50">+24% Efficiency</div>
                                    </div>
                                </div>
                            </FloatingCard>
                        </div>

                        {/* Card 3: Middle Right - Upload */}
                        <div onClick={() => navigate('/smart-upload')} className="absolute top-1/2 right-[-20px] w-40 opacity-80 pointer-events-auto cursor-pointer">
                            <FloatingCard delay={0.8} depth={0.5}>
                                <div className="p-3 bg-white/80 dark:bg-black/40 backdrop-blur-md rounded-xl border border-gray-200 dark:border-white/10 shadow-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <UploadCloud className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                        <div className="text-xs text-gray-600 dark:text-white/60">Smart Upload</div>
                                    </div>
                                    <div className="h-1 w-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full w-[70%] bg-purple-500/50" />
                                    </div>
                                </div>
                            </FloatingCard>
                        </div>
                        {/* Card 4: Top Left - Carbon Intelligence (NEW) */}
                        <div onClick={() => setShowCarbonTransition(true)} className="absolute top-10 left-0 w-52 pointer-events-auto cursor-pointer">
                            <FloatingCard delay={1.0} depth={0.8}>
                                <div className="p-4 space-y-3 bg-white/80 dark:bg-black/40 backdrop-blur-md rounded-xl border border-gray-200 dark:border-white/10 shadow-lg">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
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
                        </div>
                    </div>
                </div>

                {/* Transition Overlay */}
                <CarbonTransition
                    isOpen={showCarbonTransition}
                    onClose={() => setShowCarbonTransition(false)}
                />
            </div>
        </div>
    );
};

export default HomePage;
