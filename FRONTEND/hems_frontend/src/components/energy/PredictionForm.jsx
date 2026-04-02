import React, { useState } from 'react';
import { checkAlerts } from '../../utils/energyCalculations';
import AlertBadge from '../ui/AlertBadge';

const InputField = ({ label, name, value, onChange, placeholder, min, max, unit }) => {
    const isInvalid = value && (parseFloat(value) < min || parseFloat(value) > max);
    
    return (
        <div className="space-y-1">
            <label className="text-xs font-sans uppercase tracking-widest text-zinc-400">{label}</label>
            <div className="relative">
                <input 
                    type="number" 
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`w-full bg-surface-base border ${isInvalid ? 'border-red-500' : 'border-surface-border'} text-white placeholder-zinc-600 rounded-lg py-2.5 pl-3 pr-10 focus:outline-none focus:ring-1 ${isInvalid ? 'focus:ring-red-500' : 'focus:ring-brand-light'} font-mono text-sm transition-shadow`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs">{unit}</span>
            </div>
            {isInvalid && <p className="text-[10px] text-red-500 mt-1">Valid range: {min} - {max}</p>}
        </div>
    );
};

const PredictionForm = ({ onSubmit, isLoading }) => {
    const [formData, setFormData] = useState({
        power: '', power_factor: '', VLN: '', VLL: '', current: '', frequency: ''
    });
    const [localAlerts, setLocalAlerts] = useState([]);

    const handleChange = (e) => {
        const newForm = { ...formData, [e.target.name]: e.target.value };
        setFormData(newForm);
        // Live validation for alerts before submit
        setLocalAlerts(checkAlerts(newForm));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const isFormValid = Object.values(formData).every(val => val !== '');

    return (
        <div className="w-full">
            {/* Live Alerts Area */}
            {localAlerts.length > 0 && (
                <div className="mb-4 space-y-2">
                    {localAlerts.map(alert => (
                        <AlertBadge key={alert.id} type={alert.type} message={alert.message} />
                    ))}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-surface-card border border-surface-border p-6 rounded-2xl shadow-lg space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="Active Power" name="power" value={formData.power} onChange={handleChange} placeholder="e.g. 45" min={0} max={100} unit="kW" />
                    <InputField label="Power Factor" name="power_factor" value={formData.power_factor} onChange={handleChange} placeholder="e.g. 0.95" min={0} max={1} unit="PF" />
                    <InputField label="Voltage L-N" name="VLN" value={formData.VLN} onChange={handleChange} placeholder="e.g. 230" min={200} max={260} unit="V" />
                    <InputField label="Voltage L-L" name="VLL" value={formData.VLL} onChange={handleChange} placeholder="e.g. 400" min={340} max={460} unit="V" />
                    <InputField label="Current" name="current" value={formData.current} onChange={handleChange} placeholder="e.g. 50" min={0} max={200} unit="A" />
                    <InputField label="Frequency" name="frequency" value={formData.frequency} onChange={handleChange} placeholder="e.g. 50.0" min={49} max={51} unit="Hz" />
                </div>
                
                <button 
                    type="submit" 
                    disabled={!isFormValid || isLoading}
                    className={`w-full py-3 rounded-xl font-bold tracking-wide transition-all ${!isFormValid ? 'bg-surface-elevated text-zinc-500 cursor-not-allowed' : 'bg-gradient-to-r from-brand-dark to-brand hover:from-brand hover:to-brand-light text-white shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:-translate-y-0.5'}`}
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
                            Analysing ML Model...
                        </span>
                    ) : (
                        'Run Prediction'
                    )}
                </button>
            </form>
        </div>
    );
};

export default PredictionForm;
