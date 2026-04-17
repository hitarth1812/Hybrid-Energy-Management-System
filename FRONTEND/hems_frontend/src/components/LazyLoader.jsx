import React from 'react'
import { motion } from 'framer-motion'

/**
 * Fallback component for lazy-loaded routes
 * Shows smooth loading animation while chunk loads
 */
export const LazyLoader = () => (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#020a02]">
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-4"
        >
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full"
            />
            <p className="text-white/60 text-sm">Loading...</p>
        </motion.div>
    </div>
)
