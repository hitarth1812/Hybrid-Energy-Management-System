import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Save, X, Edit2, CheckCircle, AlertTriangle, Building } from 'lucide-react';
import api from '../services/api';
import { cn } from '../lib/utils';

const CarbonTargetManager = () => {
    const [targets, setTargets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null); // building_id being edited
    const [editValue, setEditValue] = useState('');

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Fetch Targets (using the by-building API which includes targets)
    const fetchTargets = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/carbon/by-building/', {
                params: { month: currentMonth, year: currentYear }
            });
            setTargets(res.data);
        } catch (err) {
            console.error("Failed to load targets", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTargets();
    }, []);

    // Start Editing
    const handleEdit = (building) => {
        setEditingId(building.building_id);
        setEditValue(building.target_kg || '');
    };

    // Cancel Editing
    const handleCancel = () => {
        setEditingId(null);
        setEditValue('');
    };

    // Save Target
    const handleSave = async (buildingId) => {
        try {
            await api.post('/api/carbon/target/', {
                building_id: buildingId,
                month: currentMonth,
                year: currentYear,
                target_kg: parseFloat(editValue)
            });

            // Optimistic Update
            setTargets(prev => prev.map(t =>
                t.building_id === buildingId
                    ? { ...t, target_kg: parseFloat(editValue), status: estimateStatus(t.carbon_kg, parseFloat(editValue)) }
                    : t
            ));

            setEditingId(null);
        } catch (err) {
            alert("Failed to save target.");
        }
    };

    const estimateStatus = (carbon, target) => {
        if (!target) return 'no_target';
        return carbon > target ? 'exceeded' : 'on_track';
    };

    return (
        <div className="max-w-5xl mx-auto p-4 pb-20">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3 justify-center md:justify-start">
                        <Target className="w-8 h-8 text-red-500" /> Carbon Targets
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">Set monthly emission limits for buildings ({new Date().toLocaleString('default', { month: 'long' })} {currentYear})</p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-slate-600 border-t-red-500 rounded-full animate-spin" /></div>
            ) : (
                <div className="bg-white/60 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100 dark:bg-slate-700/30 text-slate-600 dark:text-slate-300 text-sm uppercase tracking-wider">
                                    <th className="p-5 font-semibold">Building</th>
                                    <th className="p-5 font-semibold">Current Usage (kg)</th>
                                    <th className="p-5 font-semibold">Target (kg)</th>
                                    <th className="p-5 font-semibold text-center">Status</th>
                                    <th className="p-5 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 text-slate-800 dark:text-slate-200">
                                {targets.map(row => (
                                    <tr key={row.building_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                        <td className="p-5 font-medium flex items-center gap-3">
                                            <div className="p-2 bg-slate-200 dark:bg-slate-800 rounded-lg"><Building className="w-4 h-4 text-slate-500 dark:text-slate-400" /></div>
                                            {row.building}
                                        </td>
                                        <td className="p-5 tabular-nums text-lg">{row.carbon_kg}</td>

                                        {/* Target Column (Editable) */}
                                        <td className="p-5">
                                            {editingId === row.building_id ? (
                                                <input
                                                    type="number"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    className="w-32 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-slate-900 dark:text-white appearance-none"
                                                    autoFocus
                                                />
                                            ) : (
                                                <span className={cn("text-lg", !row.target_kg && "text-slate-500 italic")}>
                                                    {row.target_kg || 'Not Set'}
                                                </span>
                                            )}
                                        </td>

                                        {/* Status Column */}
                                        <td className="p-5 text-center">
                                            {row.status === 'no_target' ? (
                                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-500/20">— No Target</span>
                                            ) : row.status === 'on_track' ? (
                                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20 flex items-center justify-center gap-1 w-fit mx-auto"><CheckCircle className="w-3 h-3" /> On Track</span>
                                            ) : (
                                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center gap-1 w-fit mx-auto"><AlertTriangle className="w-3 h-3" /> Exceeded</span>
                                            )}
                                        </td>

                                        {/* Actions Column */}
                                        <td className="p-5 text-right">
                                            {editingId === row.building_id ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => handleSave(row.building_id)} className="p-2 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors"><Save className="w-5 h-5" /></button>
                                                    <button onClick={handleCancel} className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleEdit(row)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors">
                                                    <Edit2 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CarbonTargetManager;
