import React, { useState } from 'react';
import { Download, FileText, Table } from 'lucide-react';

const ExportButton = ({ data }) => {
    const [isExportingPDF, setIsExportingPDF] = useState(false);
    const [isExportingCSV, setIsExportingCSV] = useState(false);

    const handleDownloadCSV = () => {
        setIsExportingCSV(true);
        setTimeout(() => {
            // Mock CSV generation
            const csvContent = "data:text/csv;charset=utf-8,Timestamp,Consumption_kWh,CO2_kg\n" 
                + data.consumption_series.map((c, i) => `${c.timestamp},${c.consumption_kwh},${data.co2_series[i].co2_kg}`).join("\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "hems_analytics_export.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setIsExportingCSV(false);
        }, 800);
    };

    const handleDownloadPDF = () => {
        setIsExportingPDF(true);
        setTimeout(() => {
            window.print();
            setIsExportingPDF(false);
        }, 800);
    };

    return (
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-8 pt-6 border-t border-surface-border">
            <span className="text-sm text-zinc-400 font-sans mr-auto">Download intelligence snapshot for offline review.</span>
            
            <button 
                onClick={handleDownloadCSV}
                disabled={isExportingCSV || !data}
                className="w-full sm:w-auto px-5 py-2.5 bg-surface-base hover:bg-surface-elevated border border-surface-border rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
                {isExportingCSV ? <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div> : <Table className="w-4 h-4 text-emerald-400" />}
                Download CSV
            </button>
            
            <button 
                onClick={handleDownloadPDF}
                disabled={isExportingPDF || !data}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg text-sm font-bold text-emerald-400 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
                {isExportingPDF ? <div className="w-4 h-4 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin"></div> : <FileText className="w-4 h-4" />}
                Download PDF
            </button>
        </div>
    );
};

export default ExportButton;
