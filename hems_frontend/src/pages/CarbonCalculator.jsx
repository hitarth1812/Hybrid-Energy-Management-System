import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, Cell
} from 'recharts';
import {
    Calculator, Zap, Leaf, Building2, DoorOpen,
    Clock, ChevronRight, AlertCircle, Loader2
} from 'lucide-react';
import api from '../services/api';

const EMISSION_FACTOR = 0.82;
const PRESETS = [
    { label: '1 Hour', hours: 1 },
    { label: '24 Hours', hours: 24 },
    { label: '1 Week', hours: 168 },
    { label: '1 Month', hours: 720 },
    { label: '1 Year', hours: 8760 },
];
const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];

const CarbonCalculator = () => {
    const [buildings, setBuildings] = useState([]);
    const [rooms, setRooms] = useState([]);

    const [scope, setScope] = useState('room'); // 'room' | 'building'
    const [selectedBuilding, setSelectedBuilding] = useState('');
    const [selectedRoom, setSelectedRoom] = useState('');    
    const [hours, setHours] = useState(24);
    const [customHours, setCustomHours] = useState('');
    const [activePreset, setActivePreset] = useState('24 Hours');

    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Load buildings
    useEffect(() => {
        api.get('/api/buildings/').then(res => setBuildings(res.data.results || res.data));
    }, []);

    // Load rooms when building changes
    useEffect(() => {
        if (!selectedBuilding) { setRooms([]); return; }
        api.get('/api/rooms/', { params: { building: selectedBuilding } })
            .then(res => setRooms(res.data.results || res.data));
    }, [selectedBuilding]);

    const handlePreset = (preset) => {
        setHours(preset.hours);
        setActivePreset(preset.label);
        setCustomHours('');
    };

    const handleCustomHours = (val) => {
        setCustomHours(val);
        if (val && !isNaN(val) && Number(val) > 0) {
            setHours(Number(val));
            setActivePreset('');
        }
    };

    const canCalculate = () => {
        if (scope === 'room') return selectedRoom && hours > 0;
        if (scope === 'building') return selectedBuilding && hours > 0;
        return false;
    };

    const calculate = async () => {
        if (!canCalculate()) return;
        setLoading(true);
        setError(null);
        setResult(null);

        const params = { scope, hours };
        if (scope === 'room') params.room_id = selectedRoom;
        if (scope === 'building') params.building_id = selectedBuilding;

        try {
            const res = await api.get('/api/carbon/calculate/', { params });
            setResult(res.data);
        } catch (e) {
            setError('Calculation failed. Please check your selection.');
        } finally {
            setLoading(false);
        }
    };

    const treesNeeded = result ? Math.ceil(result.carbon_kg / (21 / 12)) : 0;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Config Panel */}
            <div className="bg-white/60 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
                    <Calculator className="w-5 h-5 text-emerald-500" />
                    Configure Calculation
                </h2>

                {/* Scope Tabs */}
                <div className="flex gap-2 mb-6">
                    {[
                        { key: 'room', label: 'Room', icon: DoorOpen },
                        { key: 'building', label: 'Building', icon: Building2 },
                    ].map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => { setScope(key); setResult(null); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${scope === key
                                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                                }`}
                        >
                            <Icon className="w-4 h-4" /> {label}
                        </button>
                    ))}
                </div>

                {/* Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Building */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Building</label>
                        <select
                            value={selectedBuilding}
                            onChange={e => { setSelectedBuilding(e.target.value); setSelectedRoom(''); setResult(null); }}
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none"
                        >
                            <option value="">Select Building</option>
                            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>

                    {/* Room (only for room scope) */}
                    {scope === 'room' && (
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Room</label>
                            <select
                                value={selectedRoom}
                                onChange={e => { setSelectedRoom(e.target.value); setResult(null); }}
                                disabled={!selectedBuilding}
                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none disabled:opacity-40"
                            >
                                <option value="">Select Room</option>
                                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                {/* Time Period */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Time Period
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {PRESETS.map(p => (
                            <button
                                key={p.label}
                                onClick={() => handlePreset(p)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${activePreset === p.label
                                        ? 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/20'
                                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                placeholder="Custom hours"
                                value={customHours}
                                onChange={e => handleCustomHours(e.target.value)}
                                className="w-36 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none"
                            />
                            <span className="text-xs text-slate-500">hrs</span>
                        </div>
                    </div>
                </div>

                {/* Calculate Button */}
                <button
                    onClick={calculate}
                    disabled={!canCalculate() || loading}
                    className="mt-4 flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5" />}
                    {loading ? 'Calculating...' : 'Calculate Emissions'}
                    {!loading && <ChevronRight className="w-4 h-4" />}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl">
                    <AlertCircle className="w-5 h-5 shrink-0" /> {error}
                </div>
            )}

            {/* Results */}
            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <ResultCard
                                label="Total Wattage"
                                value={result.total_watts.toLocaleString()}
                                unit="W"
                                color="text-yellow-500"
                                bg="from-yellow-500/10 to-amber-500/5"
                                border="border-yellow-500/20"
                                icon={Zap}
                            />
                            <ResultCard
                                label="Energy Used"
                                value={result.energy_kwh.toLocaleString()}
                                unit="kWh"
                                color="text-blue-400"
                                bg="from-blue-500/10 to-cyan-500/5"
                                border="border-blue-500/20"
                                icon={Zap}
                            />
                            <ResultCard
                                label="Carbon Emitted"
                                value={result.carbon_kg.toLocaleString()}
                                unit="kg CO₂"
                                color="text-red-400"
                                bg="from-red-500/10 to-orange-500/5"
                                border="border-red-500/20"
                                icon={Leaf}
                            />
                            <ResultCard
                                label="Trees to Offset"
                                value={treesNeeded.toLocaleString()}
                                unit="Trees"
                                color="text-emerald-400"
                                bg="from-emerald-500/10 to-green-500/5"
                                border="border-emerald-500/20"
                                icon={Leaf}
                            />
                        </div>

                        {/* Context */}
                        <div className="bg-slate-800/40 dark:bg-slate-800/60 rounded-xl border border-slate-700/50 p-4 text-sm text-slate-400 flex flex-wrap gap-4">
                            <span>📍 Scope: <strong className="text-white capitalize">{result.scope}</strong></span>
                            <span>⏱ Duration: <strong className="text-white">{result.hours} hours</strong></span>
                            <span>⚡ Emission Factor: <strong className="text-white">0.82 kg/kWh</strong> (India Grid)</span>
                        </div>

                        {/* Room Comparison Chart */}
                        {result.room_comparison.length > 1 && (
                            <div className="bg-white/60 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl p-6">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Room-wise Comparison</h3>
                                <p className="text-sm text-slate-500 mb-4">Carbon emissions per room (kg CO₂)</p>
                                <ResponsiveContainer width="100%" height={260}>
                                    <BarChart data={result.room_comparison} layout="vertical" margin={{ top: 0, right: 30, left: 60, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                                        <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                                        <YAxis dataKey="room" type="category" stroke="#94a3b8" fontSize={12} width={80} tickFormatter={v => v.length > 10 ? v.slice(0, 9) + '…' : v} />
                                        <RechartsTooltip
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9', borderRadius: '12px' }}
                                            formatter={(val, name) => [`${val} kg CO₂`, 'Carbon']}
                                        />
                                        <Bar dataKey="carbon_kg" radius={[0, 6, 6, 0]}>
                                            {result.room_comparison.map((_, i) => (
                                                <Cell key={i} fill={i === 0 ? '#ef4444' : i < 3 ? '#f97316' : '#22c55e'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Device Breakdown Table */
                        {result.devices.length > 0 && (
                            <div className="bg-white/60 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl overflow-hidden">
                                <div className="p-6 border-b border-slate-200 dark:border-slate-700/50">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Device Breakdown</h3>
                                    <p className="text-sm text-slate-500">{result.devices.length} devices in scope</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-100 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">
                                            <tr>
                                                <th className="p-4">Device</th>
                                                <th className="p-4">Room</th>
                                                <th className="p-4">Floor</th>
                                                <th className="p-4">Qty</th>
                                                <th className="p-4">Watts (each)</th>
                                                <th className="p-4">Total W</th>
                                                <th className="p-4">kWh</th>
                                                <th className="p-4 text-red-400">kg CO₂</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700/40 text-slate-700 dark:text-slate-300">
                                            {result.devices.map((d, i) => (
                                                <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                                    <td className="p-4 font-medium">
                                                        <div>{d.name}</div>
                                                        <div className="text-xs text-slate-400">{d.brand}</div>
                                                    </td>
                                                    <td className="p-4 text-slate-500 dark:text-slate-400">{d.room}</td>
                                                    <td className="p-4 text-slate-500 dark:text-slate-400">Floor {d.floor}</td>
                                                    <td className="p-4">{d.quantity}</td>
                                                    <td className="p-4">{d.watt_rating} W</td>
                                                    <td className="p-4 font-mono text-yellow-500">{d.effective_watts} W</td>
                                                    <td className="p-4 font-mono text-blue-400">{d.energy_kwh}</td>
                                                    <td className="p-4 font-mono font-bold text-red-400">{d.carbon_kg}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-slate-100 dark:bg-slate-700/30 font-bold text-slate-800 dark:text-white">
                                            <tr>
                                                <td className="p-4" colSpan={5}>TOTAL</td>
                                                <td className="p-4 font-mono text-yellow-400">{result.total_watts} W</td>
                                                <td className="p-4 font-mono text-blue-400">{result.energy_kwh}</td>
                                                <td className="p-4 font-mono text-red-400">{result.carbon_kg}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}

                        {result.devices.length === 0 && (
                            <div className="text-center py-16 text-slate-500 dark:text-slate-400">
                                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="font-medium">No devices found in this scope.</p>
                                <p className="text-sm mt-1">Try adding devices via the Devices page first.</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ResultCard = ({ label, value, unit, color, bg, border, icon: Icon }) => (
    <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`relative overflow-hidden bg-gradient-to-br ${bg} border ${border} rounded-2xl p-5 backdrop-blur-xl`}
    >
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-slate-500 mt-1 font-mono">{unit}</p>
        <Icon className={`absolute bottom-3 right-3 w-10 h-10 opacity-10 ${color}`} />
    </motion.div>
);

export default CarbonCalculator;
