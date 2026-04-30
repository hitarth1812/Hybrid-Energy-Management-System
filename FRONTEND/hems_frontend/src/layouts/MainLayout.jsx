import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopDragger from '../components/TopDragger';
import { cn } from '../lib/utils';

const MainLayout = () => {
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isContactOpen, setIsContactOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Toggle Dark Mode
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    const toggleTheme = () => setIsDarkMode(!isDarkMode);

    return (
        <div className={cn(
            "min-h-screen transition-colors duration-500",
            isDarkMode ? "bg-[#020a02] text-white" : "bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 text-gray-900"
        )}>
            {/* Background Gradients (Fixed) */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                {isDarkMode ? (
                    <>
                        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-green-600/20 blur-[120px] rounded-full mix-blend-screen animate-pulse" />
                        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 blur-[120px] rounded-full mix-blend-screen" />
                    </>
                ) : (
                    <>
                        <div className="absolute top-0 left-0 w-full h-full bg-[#f8fafc]" /> {/* Slate-50 base */}
                        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-200/40 blur-[100px] rounded-full mix-blend-multiply" />
                        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-200/40 blur-[100px] rounded-full mix-blend-multiply" />
                        <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] bg-purple-200/30 blur-[120px] rounded-full mix-blend-multiply" />
                    </>
                )}
            </div>

            <div className="relative z-10 flex h-screen overflow-hidden">
                {/* Sidebar — slides in/out via transform; kept in DOM for accessibility */}
                <div
                    className="shrink-0 overflow-hidden transition-all duration-300 ease-in-out"
                    style={{ width: sidebarOpen ? 288 : 0 }}
                >
                    <Sidebar
                        isDarkMode={isDarkMode}
                        toggleTheme={toggleTheme}
                        onContactClick={() => setIsContactOpen(true)}
                    />
                </div>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto relative scrollbar-hide p-8">
                    {/* Hamburger button — always visible, floats top-left */}
                    <button
                        id="sidebar-toggle"
                        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                        aria-expanded={sidebarOpen}
                        onClick={() => setSidebarOpen(o => !o)}
                        className={cn(
                            "fixed top-4 z-50 w-10 h-10 flex flex-col items-center justify-center gap-[5px] rounded-xl",
                            "bg-white/10 dark:bg-black/30 backdrop-blur-md border border-white/20 dark:border-white/10",
                            "hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-200 shadow-lg group",
                            sidebarOpen ? "left-[304px]" : "left-4"
                        )}
                    >
                        {/* Three bars that morph into ✕ */}
                        <span className={cn(
                            "block h-[2px] w-5 rounded-full bg-current transition-all duration-300 origin-center",
                            "text-slate-700 dark:text-white",
                            sidebarOpen ? "rotate-45 translate-y-[7px]" : ""
                        )} />
                        <span className={cn(
                            "block h-[2px] w-5 rounded-full bg-current transition-all duration-300",
                            "text-slate-700 dark:text-white",
                            sidebarOpen ? "opacity-0 scale-x-0" : ""
                        )} />
                        <span className={cn(
                            "block h-[2px] w-5 rounded-full bg-current transition-all duration-300 origin-center",
                            "text-slate-700 dark:text-white",
                            sidebarOpen ? "-rotate-45 -translate-y-[7px]" : ""
                        )} />
                    </button>
                    <Outlet />
                </main>
            </div>

            {/* Top Drawer (Contact Us) */}
            <TopDragger isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
        </div>
    );
};

export default MainLayout;
