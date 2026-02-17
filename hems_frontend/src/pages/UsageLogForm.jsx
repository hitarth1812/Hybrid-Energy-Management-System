import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap, Calendar, Clock, Save, Building, MapPin, Server,
    CheckCircle, AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { cn } from '../lib/utils';

const UsageLogForm = () => {
    // Form State
    const [formData, setFormData] = useState({
        buildingId: '',
        roomId: '',
        deviceId: '',
        date: new Date().toISOString().split('T')[0],
        hoursUsed: 0
    });

    // Options State
    const [buildings, setBuildings] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [devices, setDevices] = useState([]);
    const [selectedDeviceDetails, setSelectedDeviceDetails] = useState(null);

    // UI State
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null); // { type: 'success'|'error', message: '' }

    // Fetch Buildings on Mount
    useEffect(() => {
        api.get('/api/buildings/').then(res => setBuildings(res.data.results || res.data));
    }, []);

    // Fetch Rooms when Building Changes
    useEffect(() => {
        if (formData.buildingId) {
            api.get(`/api/rooms/?building=${formData.buildingId}`)
                .then(res => setRooms(res.data.results || res.data));
            setFormData(prev => ({ ...prev, roomId: '', deviceId: '' }));
            setDevices([]);
        }
    }, [formData.buildingId]);

    // Fetch Devices when Room Changes
    useEffect(() => {
        if (formData.roomId) {
            api.get(`/api/devices/?room=${formData.roomId}`)
                .then(res => setDevices(res.data.results || res.data));
            setFormData(prev => ({ ...prev, deviceId: '' }));
        }
    }, [formData.roomId]);

    // Set Device Details when Device Changes
    useEffect(() => {
        if (formData.deviceId) {
            const dev = devices.find(d => d.id === Number(formData.deviceId));
            setSelectedDeviceDetails(dev);
        } else {
            setSelectedDeviceDetails(null);
        }
    }, [formData.deviceId, devices]);

    // Handle Input Change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Calculations
    const calculatePreview = () => {
        if (!selectedDeviceDetails || !formData.hoursUsed) return { energy: 0, carbon: 0 };
        const energy = (selectedDeviceDetails.watt_rating * selectedDeviceDetails.quantity * formData.hoursUsed) / 1000;
        const carbon = energy * 0.82;
        return {
            energy: energy.toFixed(2),
            carbon: carbon.toFixed(2)
        };
    };

    const { energy, carbon } = calculatePreview();

    // Submit Handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/api/usage/log/', {
                device_id: formData.deviceId,
                date: formData.date,
                hours_used: formData.hoursUsed
            });
            showToast('success', `Logged ${carbon} kg CO₂ successfully!`);
            // Reset hours only
            setFormData(prev => ({ ...prev, hoursUsed: 0 }));
        } catch (err) {
            showToast('error', err.response?.data?.error || "Failed to log usage.");
        } finally {
            setLoading(false);
        }
    };

    const showToast = (type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 4000);
    };

    return (
        <div className="max-w-4xl mx-auto p-4 pb-20">
            {/* Header */}
            <div className="mb-8 text-center md:text-left">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3 justify-center md:justify-start">
                    <Clock className="w-8 h-8 text-green-600 dark:text-green-400" /> Log Consumption
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">Manually record usage for devices not connected to smart plugs.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

                {/* Form Card */}
                <motion.form
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6 bg-white/60 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl shadow-lg"
                    onSubmit={handleSubmit}
                >
                    {/* Building Selection */}
                    <div className="space-y-2">
                        <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Building</label>
                        <div className="relative group">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-green-500 transition-colors" />
                            <select
                                name="buildingId"
                                value={formData.buildingId}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-green-500/50 outline-none text-slate-900 dark:text-white appearance-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
                                required
                            >
                                <option value="">Select Building</option>
                                {buildings.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Room Selection */}
                    <div className="space-y-2">
                        <label className={cn("text-slate-700 dark:text-slate-300 text-sm font-medium", !formData.buildingId && "opacity-50")}>
                            Room
                        </label>
                        <div className="relative group">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                            <select
                                name="roomId"
                                value={formData.roomId}
                                onChange={handleChange}
                                disabled={!formData.buildingId}
                                className={cn(
                                    "w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none text-slate-900 dark:text-white appearance-none transition-all shadow-sm",
                                    !formData.buildingId ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                                )}
                                required
                            >
                                <option value="">Select Room</option>
                                {rooms.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Device Selection */}
                    <div className="space-y-2">
                        <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Device</label>
                        <div className="relative group">
                            <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-purple-500 transition-colors" />
                            <select
                                name="deviceId"
                                value={formData.deviceId}
                                onChange={handleChange}
                                disabled={!formData.roomId}
                                className={cn(
                                    "w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500/50 outline-none text-slate-900 dark:text-white appearance-none transition-all shadow-sm",
                                    !formData.roomId ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                                )}
                                required
                            >
                                <option value="">Select Device</option>
                                {devices.map(d => (
                                    <option key={d.id} value={d.id}>{d.name} ({d.device_type})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Device Info Card */}
                    <AnimatePresence>
                        {selectedDeviceDetails && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="bg-slate-100 dark:bg-slate-700/30 rounded-xl p-4 border border-slate-200 dark:border-slate-600/30 overflow-hidden"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-emerald-500/10 rounded-lg">
                                        <Zap className="w-6 h-6 text-emerald-400" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                        <div className="text-slate-500 dark:text-slate-400">Type: <span className="text-slate-800 dark:text-white font-medium">{selectedDeviceDetails.device_type}</span></div>
                                        <div className="text-slate-500 dark:text-slate-400">Wattage: <span className="text-slate-800 dark:text-white font-medium">{selectedDeviceDetails.watt_rating} W</span></div>
                                        <div className="text-slate-500 dark:text-slate-400">Quantity: <span className="text-slate-800 dark:text-white font-medium">{selectedDeviceDetails.quantity}</span></div>
                                        <div className="text-slate-500 dark:text-slate-400">Brand: <span className="text-slate-800 dark:text-white font-medium">{selectedDeviceDetails.brand_name || 'Generic'}</span></div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Date Picker */}
                    <div className="space-y-2">
                        <label className="text-slate-700 dark:text-slate-300 text-sm font-medium flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-orange-400" /> Usage Date
                        </label>
                        <input
                            type="date"
                            name="date"
                            value={formData.date}
                            max={new Date().toISOString().split('T')[0]}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white transition-all hover:bg-slate-50 dark:hover:bg-slate-900 appearance-none shadow-sm"
                            required
                        />
                    </div>

                    {/* Hours Input */}
                    <div className="space-y-4">
                        <label className="text-slate-700 dark:text-slate-300 text-sm font-medium flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-400" /> Hours Used
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                name="hoursUsed"
                                min="0" max="24" step="0.5"
                                value={formData.hoursUsed}
                                onChange={handleChange}
                                className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <input
                                type="number"
                                name="hoursUsed"
                                min="0" max="24" step="0.5"
                                value={formData.hoursUsed}
                                onChange={handleChange}
                                className="w-20 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-center text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading || !formData.deviceId}
                        className={cn(
                            "w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg",
                            loading || !formData.deviceId
                                ? "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                                : "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:scale-[1.02] hover:shadow-green-500/20 active:scale-95"
                        )}
                    >
                        {loading ? "Logging..." : <><Save className="w-5 h-5" /> Log Usage Entry</>}
                    </button>
                </motion.form>

                {/* Live Preview Card */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/60 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl shadow-lg h-full"
                >
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-500" /> Impact Preview
                    </h3>

                    {selectedDeviceDetails ? (
                        <div className="space-y-6">
                            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50">
                                <p className="text-sm text-slate-500 dark:text-slate-400">Selected Device</p>
                                <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">{selectedDeviceDetails.name}</p>
                                <div className="flex gap-3 mt-2 text-xs font-mono text-slate-600 dark:text-slate-300">
                                    <span className="bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">{selectedDeviceDetails.watt_rating}W</span>
                                    <span className="bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">Qty: {selectedDeviceDetails.quantity}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border border-yellow-500/20 text-center">
                                    <p className="text-xs text-yellow-700 dark:text-yellow-200 font-bold uppercase">Energy Added</p>
                                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{energy}</p>
                                    <p className="text-[10px] text-yellow-600/60 dark:text-yellow-400/60">kWh</p>
                                </div>
                                <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-pink-500/5 border border-red-500/20 text-center">
                                    <p className="text-xs text-red-700 dark:text-red-200 font-bold uppercase">Carbon Emitted</p>
                                    <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{carbon}</p>
                                    <p className="text-[10px] text-red-600/60 dark:text-red-400/60">kg CO₂</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-48 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                            <Zap className="w-8 h-8 mb-2 opacity-50" />
                            <p className="text-sm">Select a device to see impact</p>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 50, x: '-50%' }}
                        className={cn(
                            "fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 border z-50",
                            toast.type === 'success' ? "bg-green-500/20 border-green-500 text-green-400 backdrop-blur-md" : "bg-red-500/20 border-red-500 text-red-400 backdrop-blur-md"
                        )}
                    >
                        {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <span className="font-medium">{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UsageLogForm;
