import React from 'react';
import { motion } from 'framer-motion';

const RotatingTreeLoader = () => {
    return (
        <div className="flex flex-col items-center justify-center p-8">
            <div className="relative w-24 h-24">
                {/* Glowing background effect */}
                <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full animate-pulse" />

                <motion.svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-full h-full text-green-400 relative z-10"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                    {/* Stylized tree icon (Network/Hierarchy) */}
                    <path d="M12 21V11" />
                    <path d="M7 7.5L12 11l5-3.5" />
                    <path d="M12 2v9" />
                    <circle cx="12" cy="2" r="1.5" />
                    <circle cx="7" cy="7.5" r="1.5" />
                    <circle cx="17" cy="7.5" r="1.5" />
                    <circle cx="12" cy="22" r="1.5" />
                    <path d="M17 14.5l-5 3.5-5-3.5" />
                    <circle cx="17" cy="14.5" r="1.5" />
                    <circle cx="7" cy="14.5" r="1.5" />
                </motion.svg>
            </div>
            <motion.p
                className="mt-4 text-green-400 font-medium tracking-widest text-sm uppercase"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
            >
                Initializing Environment...
            </motion.p>
        </div>
    );
};

export default RotatingTreeLoader;
