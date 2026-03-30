import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Loader2, Calendar, Building, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import api from '../services/api';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

// [C2] ESGReportPage: POST now returns { status:"queued", report_id } immediately.
// We poll GET /api/carbon/esg-report/?building_id= every 3 s until status='done'
// or until we hit the max retry limit (30 × 3s = 90s).

const POLL_INTERVAL_MS = 3000;
const MAX_RETRIES = 30;

const ESGReportPage = () => {
    const [selectedBuilding, setSelectedBuilding] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

    const [buildings, setBuildings] = useState([]);
    const [reports, setReports] = useState([]);

    const [generating, setGenerating] = useState(false);
    const [pollingReportId, setPollingReportId] = useState(null);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const [timedOut, setTimedOut] = useState(false);

    // [C2] Ref holds the interval so cleanup is reliable
    const pollIntervalRef = useRef(null);
    const retryCountRef = useRef(0);

    useEffect(() => {
        api.get('/api/buildings/').then(res => setBuildings(res.data.results || res.data));
    }, []);

    useEffect(() => {
        if (selectedBuilding) {
            fetchReports();
        } else {
            setReports([]);
        }
    }, [selectedBuilding]);

    // [C2] Clean up polling interval on unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

    const fetchReports = async () => {
        try {
            const res = await api.get(`/api/carbon/esg-report/?building_id=${selectedBuilding}`);
            setReports(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const stopPolling = () => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        retryCountRef.current = 0;
    };

    // [C2] Poll until the report is 'done' or max retries reached
    const startPolling = (reportId) => {
        retryCountRef.current = 0;
        setTimedOut(false);

        pollIntervalRef.current = setInterval(async () => {
            retryCountRef.current += 1;

            if (retryCountRef.current > MAX_RETRIES) {
                stopPolling();
                setGenerating(false);
                setPollingReportId(null);
                setTimedOut(true);
                setError('Report generation timed out. Please retry.');
                return;
            }

            try {
                const res = await api.get(`/api/carbon/esg-report/?building_id=${selectedBuilding}`);
                const updatedReports = res.data;
                setReports(updatedReports);

                const target = updatedReports.find(r => r.id === reportId);
                if (target && target.status === 'done') {
                    stopPolling();
                    setGenerating(false);
                    setPollingReportId(null);
                    setSuccessMsg('Report generated successfully!');

                    if (target.download_url) {
                        const link = document.createElement('a');
                        link.href = `http://127.0.0.1:8000${target.download_url}`;
                        link.target = '_blank';
                        link.download = `ESG_Report_${selectedYear}_${selectedMonth}.pdf`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }
                } else if (target && target.status === 'error') {
                    stopPolling();
                    setGenerating(false);
                    setPollingReportId(null);
                    setError('Report generation failed on the server. Please retry.');
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, POLL_INTERVAL_MS);
    };

    const handleGenerate = async () => {
        if (!selectedBuilding) return;
        setGenerating(true);
        setError(null);
        setSuccessMsg(null);
        setTimedOut(false);
        stopPolling();

        try {
            const res = await api.post('/api/carbon/esg-report/', {
                building_id: selectedBuilding,
                month: selectedMonth,
                year: selectedYear,
            });

            // [C2] Backend returns { status:"queued", report_id }
            const reportId = res.data.report_id;
            setPollingReportId(reportId);
            startPolling(reportId);
        } catch (err) {
            setGenerating(false);
            setError(err.response?.data?.error || 'Failed to queue report.');
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 pb-20">
            {/* Header */}
            <div className="mb-8 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3 justify-center md:justify-start">
                        <FileText className="w-8 h-8 text-green-500 dark:text-green-400" /> ESG Reports
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">Generate standard environmental impact reports (PDF).</p>
                </div>
            </div>

            {/* Generator Card */}
            <div className="bg-white/60 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl mb-12 shadow-lg">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <Download className="w-5 h-5 text-blue-500 dark:text-blue-400" /> Generate New Report
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    {/* Building */}
                    <div className="space-y-2">
                        <label className="text-slate-700 dark:text-slate-400 text-sm font-medium">Building</label>
                        <div className="relative">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <select
                                value={selectedBuilding}
                                onChange={(e) => setSelectedBuilding(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-slate-900 dark:text-white appearance-none shadow-sm"
                            >
                                <option value="">Select Building</option>
                                {buildings.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Month */}
                    <div className="space-y-2">
                        <label className="text-slate-700 dark:text-slate-400 text-sm font-medium">Month</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white appearance-none shadow-sm"
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Year */}
                    <div className="space-y-2">
                        <label className="text-slate-700 dark:text-slate-400 text-sm font-medium">Year</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-slate-900 dark:text-white appearance-none shadow-sm"
                        >
                            {[2024, 2025, 2026, 2027].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    {/* Submit */}
                    <button
                        onClick={handleGenerate}
                        disabled={generating || !selectedBuilding}
                        className={cn(
                            "py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg",
                            generating || !selectedBuilding
                                ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                                : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:scale-105 active:scale-95"
                        )}
                    >
                        {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                        {generating ? 'Generating…' : 'Generate PDF'}
                    </button>
                </div>

                {/* Polling indicator */}
                {generating && pollingReportId && (
                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl flex items-center gap-2">
                        <Clock className="w-4 h-4 animate-pulse" />
                        <span>Report queued (ID&nbsp;#{pollingReportId}) — waiting for PDF to be ready…</span>
                    </div>
                )}

                {/* Status Messages */}
                {error && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> {error}
                        {timedOut && (
                            <button
                                onClick={handleGenerate}
                                className="ml-auto text-xs underline hover:no-underline"
                            >
                                Retry
                            </button>
                        )}
                    </div>
                )}
                {successMsg && (
                    <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 text-green-500 rounded-xl flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" /> {successMsg}
                    </div>
                )}
            </div>

            {/* History Table */}
            {selectedBuilding && (
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white pl-1">Report History</h3>
                    <div className="bg-white/60 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-700/30 overflow-hidden shadow-sm">
                        {reports.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 italic">No reports generated for this building yet.</div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="p-4">Period</th>
                                        <th className="p-4">Energy (kWh)</th>
                                        <th className="p-4">Carbon (kg)</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Generated At</th>
                                        <th className="p-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 text-slate-700 dark:text-slate-300">
                                    {reports.map(r => (
                                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                            <td className="p-4 font-medium text-slate-900 dark:text-white">
                                                {new Date(0, r.month - 1).toLocaleString('default', { month: 'long' })} {r.year}
                                            </td>
                                            <td className="p-4">{r.total_energy_kwh}</td>
                                            <td className="p-4">{r.total_carbon_kg}</td>
                                            <td className="p-4">
                                                <span className={cn(
                                                    "text-xs font-semibold px-2 py-1 rounded-full",
                                                    r.status === 'done' ? "bg-green-500/20 text-green-400" :
                                                    r.status === 'error' ? "bg-red-500/20 text-red-400" :
                                                    "bg-yellow-500/20 text-yellow-400"
                                                )}>
                                                    {r.status || 'done'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-500 text-sm">
                                                {format(new Date(r.generated_at), 'PPP p')}
                                            </td>
                                            <td className="p-4 text-right">
                                                {r.download_url ? (
                                                    <a
                                                        href={`http://127.0.0.1:8000${r.download_url}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white text-sm rounded-lg transition-colors"
                                                    >
                                                        <Download className="w-4 h-4" /> Download
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-400 text-xs italic">Pending…</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ESGReportPage;
