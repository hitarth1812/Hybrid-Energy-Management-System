import React from 'react';
import { motion } from 'framer-motion';
import GlassContainer from './GlassContainer';

const FloatingCard = ({ children, className, delay = 0, depth = 1 }) => {
    return (
        <motion.div
            className={className}
            initial={{ y: 0 }}
            animate={{
                y: [0, -10 * depth, 0],
            }}
            transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
                delay: delay,
            }}
        >
            <GlassContainer hoverEffect={true} className="h-full">
                {children}
            </GlassContainer>
        </motion.div>
    );
};

export default FloatingCard;
