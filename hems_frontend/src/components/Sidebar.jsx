import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    LayoutDashboard, Server, UploadCloud, Zap, Settings, HelpCircle, Moon, Sun, ChevronRight, AlertCircle,
    Globe, Clock, Target, FileText
} from 'lucide-react';
import { cn } from '../lib/utils';
import ArkaLogo from '../assets/arka_logo.png';
import CharusatLogo from '../assets/charusat_logo.jpg';

const Sidebar = ({ isDarkMode, toggleTheme, onContactClick }) => {
    const navItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { name: 'Devices', icon: Server, path: '/devices' },
        { name: 'Smart Upload', icon: UploadCloud, path: '/smart-upload' },
        { name: 'Energy Usage', icon: Zap, path: '/energy' },

        // Carbon Intelligence Platform
        { name: 'Carbon Dashboard', icon: Globe, path: '/carbon' },
        { name: 'Log Usage', icon: Clock, path: '/carbon/log' },
        { name: 'Carbon Targets', icon: Target, path: '/carbon/targets' },
        { name: 'ESG Reports', icon: FileText, path: '/carbon/reports' },
    ];

    return (
        <div className={cn(
            "h-full flex flex-col justify-between p-4 w-72 transition-all duration-500",
            // Light Mode: Crystal White Glass | Dark Mode: Deep Void Glass
            "bg-white/60 dark:bg-black/20 backdrop-blur-2xl shadow-xl",
            "border-r border-white/40 dark:border-white/5"
        )}>

            {/* Branding */}
            <div className="space-y-6 mt-4 px-2">
                <div className="flex flex-col items-center gap-2 group">
                    {/* ARKA Logo Container - Animated & Glassmorphic */}
                    <motion.div
                        className="relative w-24 h-24 shrink-0 flex items-center justify-center p-3 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/20 dark:border-white/5 shadow-inner backdrop-blur-md overflow-hidden"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        whileHover={{ scale: 1.05, rotate: 2 }}
                    >
                        {/* Glow Effect */}
                        <motion.div
                            className="absolute inset-0 bg-green-500/10 blur-xl rounded-full"
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        />

                        <motion.img
                            src={ArkaLogo}
                            alt="ARKA Logo"
                            className="w-full h-full object-contain relative z-10 drop-shadow-md"
                            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                            animate={{ y: [0, -3, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <div className="hidden absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-700 rounded-xl items-center justify-center text-white font-bold text-2xl shadow-lg">A</div>
                    </motion.div>

                    <div className="text-center">
                        <motion.h1
                            className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white drop-shadow-sm logo-text"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            ARKA
                        </motion.h1>
                        <motion.p
                            className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase tracking-wider glow-text whitespace-nowrap"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            Energy Nexus
                        </motion.p>
                    </div>
                </div>

                {/* Tagline Box */}
                <div className="mx-1 p-3 rounded-xl bg-gradient-to-br from-white/40 to-white/10 dark:from-white/10 dark:to-transparent border border-white/40 dark:border-white/10 shadow-sm relative overflow-hidden group">
                    <div className="absolute inset-0 bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <p className="text-[11px] text-slate-600 dark:text-white/80 leading-relaxed italic text-center font-medium relative z-10">
                        "With great power consumption comes great responsibility to report it."
                    </p>
                </div>
            </div>


            {/* Navigation */}
            <nav className="flex-1 mt-10 space-y-2 overflow-y-auto scrollbar-hide">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden shrink-0",
                            isActive
                                // Active State: Light (Green/White gradient), Dark (Green Glow)
                                ? "bg-gradient-to-r from-green-100/80 to-emerald-100/50 dark:from-green-500/20 dark:to-emerald-500/10 text-green-700 dark:text-green-400 shadow-sm border border-green-200 dark:border-green-500/20"
                                // Inactive State
                                : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5 hover:border-white/40 dark:hover:border-white/5 border border-transparent hover:scale-105"
                        )}
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon className={cn("w-5 h-5 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-110")} />
                                <span className="font-semibold text-sm tracking-wide">{item.name}</span>
                                <ChevronRight className={cn(
                                    "w-4 h-4 ml-auto opacity-0 transition-all duration-300",
                                    isActive ? "opacity-100 translate-x-0" : "group-hover:opacity-100 group-hover:translate-x-1"
                                )} />
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Bottom Actions */}
            <div className="space-y-4 mb-2">
                {/* Settings & Contact */}
                <div className="space-y-2 pt-4 border-t border-slate-200/50 dark:border-white/5">
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5 transition-all text-sm font-semibold hover:pl-5 hover:shadow-sm">
                        <Settings className="w-4 h-4" /> Settings
                    </button>
                    <button onClick={onContactClick} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5 transition-all text-sm font-semibold hover:pl-5 hover:shadow-sm">
                        <HelpCircle className="w-4 h-4" /> Contact Us
                    </button>
                </div>

                {/* Theme Toggle & University Logo */}
                <div className="flex items-center justify-between px-3 py-3 bg-white/40 dark:bg-black/20 rounded-2xl border border-white/60 dark:border-white/5 backdrop-blur-xl shadow-lg">
                    <div className="flex items-center gap-3">
                        {/* CHARUSAT Logo - Badge Style */}
                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white dark:border-white/10 shadow-md bg-white shrink-0 flex items-center justify-center p-0.5">
                            <img
                                src={CharusatLogo}
                                alt="CHARUSAT"
                                className="w-full h-full object-contain"
                                onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement.innerText = 'CH'; e.currentTarget.parentElement.className += ' text-xs font-bold text-blue-900'; }}
                            />
                        </div>

                        <div className="flex flex-col">
                            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 dark:text-white/40">Powered By</span>
                            <span className="text-xs font-bold text-slate-800 dark:text-white/90">CHARUSAT</span>
                        </div>
                    </div>

                    <button
                        onClick={toggleTheme}
                        className="w-9 h-9 rounded-xl bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-white/50 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-white/80 transition-all hover:rotate-12 hover:scale-110 shadow-sm active:scale-95"
                    >
                        {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500 drop-shadow-lg" /> : <Moon className="w-5 h-5 text-indigo-600" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
