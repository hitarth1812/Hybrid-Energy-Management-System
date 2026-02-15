import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopDragger from '../components/TopDragger';
import { cn } from '../lib/utils';
import ImmersiveDashboard from '../pages/ImmersiveDashboard'; // Fallback / Home

const MainLayout = () => {
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isContactOpen, setIsContactOpen] = useState(false);

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
            isDarkMode ? "bg-[#020a02] text-white" : "bg-gray-50 text-gray-900"
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
                {/* Sidebar */}
                <Sidebar
                    isDarkMode={isDarkMode}
                    toggleTheme={toggleTheme}
                    onContactClick={() => setIsContactOpen(true)}
                />

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto relative scrollbar-hide p-8">
                    <Outlet />
                </main>
            </div>

            {/* Top Drawer (Contact Us) */}
            <TopDragger isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
        </div>
    );
};

export default MainLayout;
