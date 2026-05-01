import React, { useState, useEffect } from 'react';
import { FileText, Download, Loader2, Calendar, Building, CheckCircle, AlertTriangle, Clock, Activity, RotateCcw } from 'lucide-react';
import api from '../services/api';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

const ESGReportPage = () => {
    const [selectedBuilding, setSelectedBuilding] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const today = new Date();
    const [dateTo, setDateTo] = useState(format(today, 'yyyy-MM-dd'));
    const [dateFrom, setDateFrom] = useState(format(new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
    const [granularity, setGranularity] = useState('day');

    const [buildings, setBuildings] = useState([]);
    const [reports, setReports] = useState([]);
    const [isInstantDownloading, setIsInstantDownloading] = useState(false);

    // --- FIX 12: FULL UX STATE MACHINE ---
    // idle -> submitting -> pending -> processing -> done/error/timeout
    const [status, setStatus] = useState('idle');
    const [downloadUrl, setDownloadUrl] = useState(null);
    const [lowConfidenceWarning, setLowConfidenceWarning] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        api.get('/api/buildings/').then(res => setBuildings(res.data.results || res.data)).catch(console.error);
    }, []);

    useEffect(() => {
        fetchReports();
        setStatus('idle');
    }, []);

    const fetchReports = async () => {
        try {
            const res = await api.get(`/api/carbon/esg-report/`);
            setReports(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleGenerate = async () => {
        setStatus('submitting');
        setErrorMessage('');
        setDownloadUrl(null);

        try {
            const res = await api.post('/api/carbon/esg-report/', {
                month: selectedMonth,
                year: selectedYear,
            });

            // Queue successful — hook up event source listener mapping
            startSSETimer(res.data.report_id);
        } catch (err) {
            setStatus('error');
            const dataErr = err.response?.data;
            if (dataErr && typeof dataErr === 'object') {
                if (dataErr.detail) setErrorMessage(dataErr.detail);
                else if (dataErr.error) setErrorMessage(dataErr.error);
                else setErrorMessage(Object.values(dataErr)[0][0] || 'Validation error');
            } else {
                setErrorMessage('Failed to queue report up on server.');
            }
        }
    };

    const downloadInstantReport = async () => {
        setIsInstantDownloading(true);
        try {
            const res = await api.get('/api/energy/esg-report/', {
                params: {
                    date_from: dateFrom,
                    date_to: dateTo,
                    granularity,
                },
                responseType: 'blob',
                timeout: 120000, // 2 minutes timeout for heavy instant report
            });
            const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = `ESG_Report_${dateFrom}_${dateTo}_${granularity}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download ESG report:', err);
        } finally {
            setIsInstantDownloading(false);
        }
    };

    // --- FIX 8: REPLACE POLLING WITH SERVER-SENT EVENTS ---
    const startSSETimer = (reportId) => {
        setStatus('pending');
        fetchReports(); // Trigger an instant background refresh displaying the new 'pending' item

        // Send token securely across raw EventSource
        const token = localStorage.getItem('access_token');
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const url = `${baseUrl}/api/carbon/esg-report/stream/${reportId}/?token=${token}`;

        const es = new EventSource(url);
        
        let timeoutRef;

        const forceCloseConnection = () => {
            es.close();
            if (timeoutRef) clearTimeout(timeoutRef);
            fetchReports();
        };

        timeoutRef = setTimeout(() => {
            setStatus((prev) => {
                if (prev !== 'done' && prev !== 'error') {
                    forceCloseConnection();
                    return 'timeout';
                }
                return prev;
            });
        }, 180000); // 3-minute hard window for active web connection

        es.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                
                setStatus(prev => {
                    // Prevent overlapping rapid updates reversing completed states
                    if (prev === 'done' || prev === 'error') return prev;
                    if (data.status) return data.status;
                    return prev;
                });

                if (data.status === 'done') {
                    forceCloseConnection();
                    setDownloadUrl(data.download_url);
                    setLowConfidenceWarning(data.low_confidence_warning || false);
                    triggerDownload(data.download_url);
                }
                else if (data.status === 'error') {
                    forceCloseConnection();
                    setErrorMessage(data.error_message || 'Report rendering failed natively during the generation cycle.');
                }
            } catch (err) {
                console.error("SSE parse exception:", err);
            }
        };

        es.onerror = () => {
            forceCloseConnection();
            setStatus(prev => {
                if (prev !== 'done') {
                    setErrorMessage('Real-time connection to the rendering worker was prematurely severed.');
                    return 'error';
                }
                return prev;
            });
        };
    };

    const triggerDownload = (pathOrUrl) => {
        if (!pathOrUrl) return;
        const link = document.createElement('a');
        const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
        link.href = `${baseUrl}${pathOrUrl}`;
        // Automatically downloading 
        link.target = '_blank';
        link.download = `ESG_Report_${selectedYear}_${selectedMonth}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const resetState = () => {
        setStatus('idle');
        setErrorMessage('');
        setDownloadUrl(null);
        setLowConfidenceWarning(false);
        fetchReports();
    };

    return (
        <div className="max-w-6xl mx-auto p-4 pb-20">
            {/* Header Area */}
            <div className="mb-8 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3 justify-center md:justify-start">
                        <FileText className="w-8 h-8 text-green-500 dark:text-green-400" /> Executive ESG Extractor
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">Generate standard environmental, social & governance impact metrics (PDF).</p>
                </div>
            </div>

            {/* Generator Form */}
            <div className="bg-white/40 backdrop-blur-xl dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl mb-12 shadow-lg">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <Download className="w-5 h-5 text-blue-500 dark:text-blue-400" /> Run New Extraction
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end transition-all">

                    {/* Month Select Element */}
                    <div className="space-y-2">
                        <label className="text-slate-700 dark:text-slate-400 text-sm font-medium">Metric Month</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <select
                                disabled={status !== 'idle' && status !== 'error' && status !== 'done' && status !== 'timeout'}
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white appearance-none shadow-sm disabled:opacity-50"
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Year Select Element */}
                    <div className="space-y-2">
                        <label className="text-slate-700 dark:text-slate-400 text-sm font-medium">Report Year</label>
                        <select
                            disabled={status !== 'idle' && status !== 'error' && status !== 'done' && status !== 'timeout'}
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-slate-900 dark:text-white appearance-none shadow-sm disabled:opacity-50"
                        >
                            {[2024, 2025, 2026, 2027].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date From */}
                    <div className="space-y-2">
                        <label className="text-slate-700 dark:text-slate-400 text-sm font-medium">Date From</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-slate-900 dark:text-white shadow-sm"
                        />
                    </div>

                    {/* Date To */}
                    <div className="space-y-2">
                        <label className="text-slate-700 dark:text-slate-400 text-sm font-medium">Date To</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-slate-900 dark:text-white shadow-sm"
                        />
                    </div>

                    {/* Granularity */}
                    <div className="space-y-2">
                        <label className="text-slate-700 dark:text-slate-400 text-sm font-medium">Granularity</label>
                        <select
                            value={granularity}
                            onChange={(e) => setGranularity(e.target.value)}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-slate-900 dark:text-white shadow-sm"
                        >
                            <option value="day">Daily</option>
                            <option value="month">Monthly</option>
                            <option value="year">Yearly</option>
                        </select>
                    </div>


                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                    <button
                        onClick={downloadInstantReport}
                        disabled={isInstantDownloading}
                        className={cn(
                            "py-2.5 px-5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow",
                            isInstantDownloading
                                ? "bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed"
                                : "bg-emerald-600 text-white hover:bg-emerald-700"
                        )}
                    >
                        {isInstantDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Download ESG Report
                    </button>
                </div>

                {/* Status Rendering Components */}
                {status === 'pending' && (
                    <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center gap-3">
                        <div className="relative flex items-center justify-center w-5 h-5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </div>
                        <span className="font-medium tracking-wide">Report successfully queued! Waiting for Celery worker assignment...</span>
                    </div>
                )}

                {status === 'processing' && (
                    <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 rounded-xl space-y-3">
                        <div className="flex items-center gap-3">
                            <Activity className="w-5 h-5 animate-pulse text-purple-500" />
                            <span className="font-medium tracking-wide">Generating PDF Graphics Payload...</span>
                        </div>
                        {/* Indeterminate loader element */}
                        <div className="h-1.5 w-full bg-purple-200 dark:bg-purple-900 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 w-1/3 animate-[slideRight_1.5s_infinite_linear] rounded-full"></div>
                        </div>
                    </div>
                )}

                {status === 'done' && (
                    <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-green-700 dark:text-green-400">
                            <CheckCircle className="w-6 h-6 shrink-0" />
                            <span className="font-semibold text-base leading-tight">Secure signed PDF successfully generated.</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm font-semibold">
                            <div className="relative group inline-flex">
                                <button onClick={() => triggerDownload(downloadUrl)} className={cn("px-4 py-2 text-white shadow transition-all rounded-lg flex items-center gap-2 active:scale-95", lowConfidenceWarning ? "bg-amber-500 hover:bg-amber-600" : "bg-green-600 hover:bg-green-700")}>
                                    <Download className="w-4 h-4"/> Download PDF
                                </button>
                                {lowConfidenceWarning && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs px-3 py-2 bg-slate-900 text-amber-400 text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                                        Low Confidence Warning: Fallback model used or low aggregate forecast confidence.
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 pointer-events-none"></div>
                                    </div>
                                )}
                            </div>
                            <button onClick={resetState} className="text-slate-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 mx-2 hover:underline inline-flex items-baseline">
                                Generate Another Link
                            </button>
                        </div>
                    </div>
                )}

                {status === 'timeout' && (
                    <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 rounded-xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Clock className="w-6 h-6" />
                            <span className="font-medium">Taking longer than expected — you'll receive a secure completion email as soon as it's ready.</span>
                        </div>
                        <button onClick={resetState} className="px-3 text-xs bg-amber-600/20 hover:bg-amber-600/40 rounded-lg py-1 transition font-bold">Close Panel</button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl flex items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3">
                            <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5 sm:mt-0" />
                            <div>
                                <h4 className="font-bold text-sm uppercase tracking-wider text-red-700/80 dark:text-red-400/80 mb-0.5">Critical Trace Exception</h4>
                                <p className="font-medium">{errorMessage}</p>
                            </div>
                        </div>
                        <button onClick={handleGenerate} className="shrink-0 px-4 py-2 bg-red-100 dark:bg-red-500/20 hover:bg-red-200 dark:hover:bg-red-500/30 text-red-700 dark:text-red-300 font-bold text-sm tracking-wide rounded-lg transition">
                            Override & Retry
                        </button>
                    </div>
                )}
            </div>

            {/* Global History Table Module */}
            <style>{`@keyframes slideRight { 0% { transform: translateX(-100%) } 100% { transform: translateX(300%) }}`}</style>
            
            {selectedBuilding && (
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white pl-1 tracking-tight">Active Generation History</h3>
                    <div className="bg-white/40 backdrop-blur-xl dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-700/30 overflow-hidden shadow-sm">
                        {reports.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 italic">This building contains zero legacy reporting footprints.</div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="p-4">Fiscal Period</th>
                                        <th className="p-4">Energy Offset (kWh)</th>
                                        <th className="p-4">Emissions Tracked (kg)</th>
                                        <th className="p-4">Celery Status</th>
                                        <th className="p-4">Timestamp Trace</th>
                                        <th className="p-4 text-right">Vault Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 text-slate-700 dark:text-slate-300 font-medium">
                                    {reports.map(r => (
                                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                            <td className="p-4 text-slate-900 dark:text-white">
                                                {new Date(0, r.month - 1).toLocaleString('default', { month: 'long' })} {r.year}
                                            </td>
                                            <td className="p-4">{r.total_energy_kwh}</td>
                                            <td className="p-4">{r.total_carbon_kg}</td>
                                            <td className="p-4">
                                                <span className={cn(
                                                    "text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full",
                                                    r.status === 'done' ? "bg-green-500/20 text-green-500" :
                                                    r.status === 'error' ? "bg-red-500/20 text-red-500" :
                                                    r.status === 'processing' ? "bg-purple-500/20 text-purple-500" :
                                                    "bg-blue-500/20 text-blue-500"
                                                )}>
                                                    {r.status || 'pending'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-400 text-xs uppercase">
                                                {format(new Date(r.generated_at), 'PPP p')}
                                            </td>
                                            <td className="p-4 text-right">
                                                {r.download_url && r.status === 'done' ? (
                                                    <div className="relative group inline-block">
                                                        <a
                                                            href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${r.download_url}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={cn("inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold uppercase tracking-wide rounded-lg transition-colors cursor-pointer", r.low_confidence_warning ? "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/70" : "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white")}
                                                        >
                                                            <Download className="w-3.5 h-3.5" /> Direct Pull
                                                        </a>
                                                        {r.low_confidence_warning && (
                                                            <div className="absolute bottom-full right-0 mb-2 w-max max-w-[200px] px-3 py-1.5 bg-slate-900 text-amber-400 text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-normal text-left">
                                                                Low Confidence Forecast
                                                                <div className="absolute top-full right-6 border-4 border-transparent border-t-slate-900 pointer-events-none"></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-xs italic">{r.status === 'error' ? 'Terminated' : 'Computing Hash...'}</span>
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
