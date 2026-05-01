import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import api from '../services/api';
import CarbonCalculator from './CarbonCalculator';

const CarbonDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [buildingsList, setBuildingsList] = useState([]);

    // Filters
    const [selectedBuilding, setSelectedBuilding] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

    // Fetch Initial Buildings List
    useEffect(() => {
        api.get('/api/buildings/')
            .then(res => setBuildingsList(res.data.results || res.data))
            .catch(err => console.error("Failed to load buildings", err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="space-y-8 p-2 max-w-7xl mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/40 backdrop-blur-xl dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-700 dark:from-green-400 dark:to-emerald-600 bg-clip-text text-transparent">
                        Carbon Intelligence
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">Real-time energy & emission tracking</p>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center gap-3 animate-pulse">
                    <AlertTriangle className="w-5 h-5" /> {error}
                </div>
            )}

            {/* Calculator Tab */}
            <motion.div
                key="calculator"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
            >
                <CarbonCalculator />
            </motion.div>
        </div>
    );
};

export default CarbonDashboard;
