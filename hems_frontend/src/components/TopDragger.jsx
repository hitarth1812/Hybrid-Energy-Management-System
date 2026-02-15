import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Phone, MapPin, Send } from 'lucide-react';
import GlassContainer from './GlassContainer';

const TopDragger = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Content */}
                    <motion.div
                        initial={{ y: "-100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "-100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4 pointer-events-none"
                    >
                        <GlassContainer className="pointer-events-auto w-full max-w-2xl bg-white/90 dark:bg-black/80 border-b border-x border-gray-200 dark:border-white/10 rounded-b-2xl shadow-2xl p-8 relative overflow-hidden">
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-white/60 hover:text-black dark:hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="grid md:grid-cols-2 gap-8">
                                {/* Contact Info */}
                                <div className="space-y-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Get in Touch</h2>
                                        <p className="text-gray-600 dark:text-white/60 text-sm">Have questions about your energy usage? Our team is here to help.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 text-gray-700 dark:text-white/80">
                                            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                                                <Mail className="w-4 h-4 text-green-600 dark:text-green-400" />
                                            </div>
                                            <span className="text-sm">support@arka-energy.com</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-gray-700 dark:text-white/80">
                                            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                                                <Phone className="w-4 h-4 text-green-600 dark:text-green-400" />
                                            </div>
                                            <span className="text-sm">+91 98765 43210</span>
                                        </div>
                                        <div className="flex items-start gap-3 text-gray-700 dark:text-white/80">
                                            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center mt-1">
                                                <MapPin className="w-4 h-4 text-green-600 dark:text-green-400" />
                                            </div>
                                            <span className="text-sm">Charotar University of Science and Technology (CHARUSAT), Changa, Gujarat</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Form */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-500 dark:text-white/60 font-medium uppercase tracking-wider">Your Message</label>
                                        <textarea
                                            className="w-full h-32 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/20 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all resize-none text-sm"
                                            placeholder="How can we assist you today?"
                                        />
                                    </div>
                                    <button className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 group shadow-lg shadow-green-500/20">
                                        Send Message
                                        <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </GlassContainer>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default TopDragger;
