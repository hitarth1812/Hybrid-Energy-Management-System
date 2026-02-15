import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import GlassContainer from '../components/GlassContainer';
import RotatingTreeLoader from '../components/RotatingTreeLoader';
import GlowingGlobe from '../components/GlowingGlobe';
import FloatingCard from '../components/FloatingCard';
import { ArrowRight, BarChart3, Globe, Shield, Zap } from 'lucide-react';

const ImmersiveDashboard = ({ onBack }) => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate loading state
        const timer = setTimeout(() => setLoading(false), 2500);
        return () => clearTimeout(timer);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#051a05] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-900/40 via-[#020a02] to-black" />
                <RotatingTreeLoader />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020a02] text-white relative overflow-hidden font-sans selection:bg-green-500/30">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-green-600/20 blur-[120px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 blur-[120px] rounded-full mix-blend-screen" />
            </div>

            {/* Navigation (Glass Bar) */}
            <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-5xl">
                <GlassContainer className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-black font-bold">H</div>
                        <span className="font-bold text-lg tracking-tight">HEMS<span className="text-green-500">.ai</span></span>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
                        <button onClick={onBack} className="hover:text-white transition-colors">Back to App</button>
                        <a href="#" className="hover:text-white transition-colors">Platform</a>
                        <a href="#" className="hover:text-white transition-colors">Solutions</a>
                        <a href="#" className="hover:text-white transition-colors">Developers</a>
                        <a href="#" className="hover:text-white transition-colors">Pricing</a>
                    </div>

                    <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all backdrop-blur-md border border-white/5">
                        Get Started
                    </button>
                </GlassContainer>
            </nav>

            {/* Main Content */}
            <main className="relative z-10 pt-32 pb-20 px-6 container mx-auto">

                {/* Hero Section */}
                <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[60vh]">

                    {/* Text Content */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="space-y-8"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium uppercase tracking-wider">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            Live System Status
                        </div>

                        <h1 className="text-5xl lg:text-7xl font-bold leading-tight tracking-tight">
                            Turn Every <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">User Insight</span> Into Your Next Big Feature.
                        </h1>

                        <p className="text-lg text-white/60 max-w-xl leading-relaxed">
                            Real-time energy management and analytics powered by advanced AI. Visualize your data like never before with our immersive glassmorphism dashboard.
                        </p>

                        <div className="flex flex-wrap items-center gap-4">
                            <button className="group relative px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_40px_rgba(34,197,94,0.5)] overflow-hidden">
                                <span className="relative z-10 flex items-center gap-2">
                                    Build on Stable <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 -translate-x-full group-hover:animate-shimmer" />
                            </button>

                            <button className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold transition-all border border-white/10 backdrop-blur-sm">
                                Learn More
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
                            <GlowingGlobe className="opacity-80 mix-blend-plus-lighter" />
                        </motion.div>

                        {/* Floating Cards Layer */}
                        <div className="absolute inset-0 z-10 pointer-events-none">
                            {/* Card 1: Top Right */}
                            <FloatingCard className="absolute top-10 right-10 w-48" delay={0} depth={1.2}>
                                <div className="p-4 space-y-3">
                                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                        <Zap className="w-4 h-4 text-green-400" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="h-2 w-12 bg-white/20 rounded-full" />
                                        <div className="h-2 w-20 bg-white/10 rounded-full" />
                                    </div>
                                </div>
                            </FloatingCard>

                            {/* Card 2: Bottom Left */}
                            <FloatingCard className="absolute bottom-20 left-0 w-56" delay={1.5} depth={1.5}>
                                <div className="p-4 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                        <BarChart3 className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white/90">Analytics Ready</div>
                                        <div className="text-xs text-white/50">+24% Efficiency</div>
                                    </div>
                                </div>
                            </FloatingCard>

                            {/* Card 3: Middle Right / Far */}
                            <FloatingCard className="absolute top-1/2 right-[-20px] w-40 opacity-60 blur-[1px]" delay={0.8} depth={0.5}>
                                <div className="p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        <div className="text-xs text-white/60">Node Active</div>
                                    </div>
                                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full w-[70%] bg-green-500/50" />
                                    </div>
                                </div>
                            </FloatingCard>
                        </div>
                    </div>
                </div>

                {/* Bottom Glass Bar */}
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1, duration: 0.8 }}
                    className="mt-20 mx-auto max-w-4xl"
                >
                    <GlassContainer className="p-1 rounded-full flex items-center justify-around overflow-x-auto gap-8 px-12 py-6">
                        {['UpGlam', 'Nutrilix', 'Investify', 'Knewish'].map((brand) => (
                            <div key={brand} className="text-white/40 font-semibold text-xl tracking-wider hover:text-white/80 transition-colors cursor-pointer flex items-center gap-2">
                                <Globe className="w-5 h-5 opacity-50" /> {brand}
                            </div>
                        ))}
                    </GlassContainer>
                </motion.div>

            </main>
        </div>
    );
};

export default ImmersiveDashboard;
