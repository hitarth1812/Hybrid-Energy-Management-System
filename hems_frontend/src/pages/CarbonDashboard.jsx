import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    LineChart, Line, Area, AreaChart, PieChart, Pie, Cell
} from 'recharts';
import {
    LayoutDashboard, TrendingUp, Zap, TreeDeciduous, AlertTriangle,
    Filter, Calendar, Building
} from 'lucide-react';
import api from '../services/api';
import { cn } from '../lib/utils';

// Colors for charts
const COLORS = ['#22c55e', '#3b82f6', '#f97316', '#ef4444', '#a855f7', '#eab308'];

const CarbonDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dashboardData, setDashboardData] = useState(null);
    const [buildingData, setBuildingData] = useState([]);
    const [buildingsList, setBuildingsList] = useState([]); // For dropdown

    // Filters
    const [selectedBuilding, setSelectedBuilding] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

    // Fetch Initial Buildings List
    useEffect(() => {
        api.get('/api/buildings/')
            .then(res => setBuildingsList(res.data.results || res.data))
            .catch(err => console.error("Failed to load buildings", err));
    }, []);

    // Fetch Dashboard Data
    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const params = {
                building: selectedBuilding || undefined,
                year: selectedYear,
                month: selectedMonth
            };

            const [dashRes, buildRes] = await Promise.all([
                api.get('/api/carbon/dashboard/', { params }),
                api.get('/api/carbon/by-building/', { params: { year: selectedYear, month: selectedMonth } })
            ]);

            setDashboardData(dashRes.data);
            setBuildingData(buildRes.data);
        } catch (err) {
            console.error(err);
            setError("Failed to load carbon intelligence data.");
        } finally {
            setLoading(false);
        }
    };

    // Effect: Fetch on mount + filter change
    useEffect(() => {
        fetchData();
        // Auto-refresh every 60s
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, [selectedBuilding, selectedYear, selectedMonth]);

    // Derived Metrics
    const treesOffset = dashboardData ? Math.ceil(dashboardData.this_month.carbon_kg / (21 / 12)) : 0;

    return (
        <div className="space-y-8 p-2 max-w-7xl mx-auto pb-20">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-700 dark:from-green-400 dark:to-emerald-600 bg-clip-text text-transparent flex items-center gap-3">
                        <LayoutDashboard className="w-8 h-8 text-green-600 dark:text-green-500" />
                        Carbon Intelligence
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">Real-time energy & emission tracking</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    {/* Building Select */}
                    <div className="relative group">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" />
                        <select
                            value={selectedBuilding}
                            onChange={(e) => setSelectedBuilding(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none text-slate-800 dark:text-slate-200 text-sm appearance-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
                        >
                            <option value="">All Buildings</option>
                            {buildingsList.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Month Select */}
                    <div className="relative group">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-slate-200 text-sm hover:bg-slate-800 transition-all"
                        >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                            ))}
                        </select>
                    </div>

                    {/* Year Select */}
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none text-slate-200 text-sm hover:bg-slate-800 transition-all"
                    >
                        {[2024, 2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center gap-3 animate-pulse">
                    <AlertTriangle className="w-5 h-5" /> {error}
                </div>
            )}

            {loading && !dashboardData ? (
                // Skeleton Loading
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-slate-800/50 rounded-2xl" />)}
                </div>
            ) : (
                dashboardData && (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Today CO2 */}
                            <KPICard
                                title="Today's Carbon"
                                value={`${dashboardData.today.carbon_kg} `}
                                unit="kg CO₂"
                                icon={TrendingUp}
                                color={dashboardData.today.carbon_kg > 100 ? "text-red-500" : "text-green-500"}
                                subtext="Daily Emission"
                                glow={dashboardData.today.carbon_kg > 100 ? "red" : "green"}
                            />
                            {/* This Month CO2 */}
                            <KPICard
                                title="Monthly Carbon"
                                value={`${dashboardData.this_month.carbon_kg} `}
                                unit="kg CO₂"
                                icon={Filter}
                                color="text-blue-500"
                                subtext={`vs ${dashboardData.this_year.carbon_kg} Yearly`}
                                glow="blue"
                            />
                            {/* This Month Energy */}
                            <KPICard
                                title="Energy Used"
                                value={`${dashboardData.this_month.energy_kwh} `}
                                unit="kWh"
                                icon={Zap}
                                color="text-yellow-500"
                                subtext="Total Consumption"
                                glow="yellow"
                            />
                            {/* Trees Offset */}
                            <KPICard
                                title="Trees Needed"
                                value={`${treesOffset} `}
                                unit="Trees"
                                icon={TreeDeciduous}
                                color="text-emerald-500"
                                subtext="To offset monthly CO₂"
                                glow="emerald"
                            />
                        </div>

                        {/* Charts Row 1 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Top Rooms Chart */}
                            <ChartCard title="Top Polluting Rooms" subtitle="Highest CO₂ emissions this month">
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={dashboardData.top_rooms} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                                        <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                                        <YAxis dataKey="room" type="category" stroke="#94a3b8" width={100} fontSize={12} tickFormatter={(val) => val.length > 12 ? val.substr(0, 10) + '..' : val} />
                                        <RechartsTooltip
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                                            cursor={{ fill: '#334155', opacity: 0.2 }}
                                        />
                                        <Bar dataKey="carbon_kg" radius={[0, 4, 4, 0]}>
                                            {dashboardData.top_rooms.map((entry, index) => (
                                                <Cell key={`cell - ${index} `} fill={index === 0 ? '#ef4444' : index < 3 ? '#f97316' : '#22c55e'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartCard>

                            {/* Yearly Trend Chart */}
                            <ChartCard title={`${selectedYear} Emission Trend`} subtitle="Monthly Carbon Footprint (kg)">
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={dashboardData.monthly_trend}>
                                        <defs>
                                            <linearGradient id="colorCo2" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                                        <XAxis dataKey="month_name" stroke="#94a3b8" fontSize={12} />
                                        <YAxis stroke="#94a3b8" fontSize={12} />
                                        <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }} />
                                        <Area type="monotone" dataKey="carbon_kg" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCo2)" strokeWidth={3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </ChartCard>
                        </div>

                        {/* Leaderboard Table */}
                        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 backdrop-blur-xl overflow-hidden">
                            <div className="p-6 border-b border-slate-700/50">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Building className="w-5 h-5 text-indigo-400" /> Building Performance Leaderboard
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-700/30 text-slate-300 text-sm uppercase tracking-wider">
                                            <th className="p-4 font-semibold">Rank</th>
                                            <th className="p-4 font-semibold">Building</th>
                                            <th className="p-4 font-semibold">Energy (kWh)</th>
                                            <th className="p-4 font-semibold">Carbon (kg)</th>
                                            <th className="p-4 font-semibold">Target (kg)</th>
                                            <th className="p-4 font-semibold">% of Target</th>
                                            <th className="p-4 font-semibold text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/50 text-slate-200">
                                        {buildingData.map((b, idx) => (
                                            <tr
                                                key={b.building_id}
                                                onClick={() => setSelectedBuilding(b.building_id)}
                                                className={cn(
                                                    "group hover:bg-slate-700/30 transition-colors cursor-pointer text-sm",
                                                    b.status === 'exceeded' && "bg-red-500/5 hover:bg-red-500/10"
                                                )}
                                            >
                                                <td className="p-4 font-mono text-slate-400">#{idx + 1}</td>
                                                <td className="p-4 font-medium text-white">{b.building}</td>
                                                <td className="p-4">{b.energy_kwh}</td>
                                                <td className="p-4">{b.carbon_kg}</td>
                                                <td className="p-4 text-slate-400">{b.target_kg || '—'}</td>
                                                <td className="p-4">
                                                    {b.target_kg ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                                                                <div
                                                                    className={cn("h-full rounded-full", b.percent_of_target > 100 ? "bg-red-500" : "bg-green-500")}
                                                                    style={{ width: `${Math.min(b.percent_of_target, 100)}% ` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs">{b.percent_of_target}%</span>
                                                        </div>
                                                    ) : '—'}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={cn(
                                                        "px-3 py-1 rounded-full text-xs font-bold border",
                                                        b.status === 'on_track' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                                                            b.status === 'exceeded' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                                                "bg-slate-500/10 text-slate-400 border-slate-500/20"
                                                    )}>
                                                        {b.status === 'on_track' ? "✅ On Track" :
                                                            b.status === 'exceeded' ? "❌ Exceeded" : "— No Target"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Charts Row 2 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Device Breakdown */}
                            <ChartCard title="Emissions by Device Type" subtitle="Distribution of Carbon Footprint">
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={dashboardData.top_device_types}
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="carbon_kg"
                                            nameKey="device_type"
                                            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                                const RADIAN = Math.PI / 180;
                                                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                                return percent > 0.05 ? (
                                                    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                                                        {`${(percent * 100).toFixed(0)}% `}
                                                    </text>
                                                ) : null;
                                            }}
                                        >
                                            {dashboardData.top_device_types.map((entry, index) => (
                                                <Cell key={`cell - ${index} `} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartCard>

                            {/* Top Consumers */}
                            <ChartCard title="Top Energy Consumers" subtitle="Device Types by kWh Usage">
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={dashboardData.top_device_types} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                                        <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                                        <YAxis dataKey="device_type" type="category" stroke="#94a3b8" width={100} fontSize={12} />
                                        <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }} />
                                        <Bar dataKey="energy_kwh" fill="#a855f7" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartCard>
                        </div>
                    </>
                )
            )}
        </div>
    );
};

// Reusable Components
const KPICard = ({ title, value, unit, icon: Icon, color, subtext, glow }) => (
    <motion.div
        whileHover={{ y: -5 }}
        className="relative overflow-hidden bg-white/60 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl shadow-lg group"
    >
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
            <Icon className="w-24 h-24 transform rotate-12 -translate-y-8 translate-x-8" />
        </div>

        <div className="flex justify-between items-start relative z-10">
            <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">{title}</p>
                <h3 className={`text-4xl font-bold mt-2 text-slate-800 dark:text-white drop-shadow-sm`}>{value}</h3>
                <p className="text-slate-500 text-xs mt-1 font-mono">{unit}</p>
            </div>
            <div className={`p-3 rounded-xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/30 flex items-center gap-2">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-700/30 px-2 py-1 rounded-md">
                {subtext}
            </span>
        </div>
    </motion.div>
);

const ChartCard = ({ title, subtitle, children }) => (
    <div className="bg-white/60 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl shadow-lg flex flex-col h-full">
        <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <div className="flex-1 w-full min-h-[300px]">
            {children}
        </div>
    </div>
);

export default CarbonDashboard;
