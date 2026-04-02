export const calculateApparentPower = (power_kw, power_factor) => {
    if (!power_factor || power_factor === 0) return 0;
    return power_kw / power_factor; // kVA
};

export const calculateReactivePower = (apparent_kva, power_kw) => {
    // sqrt(S^2 - P^2) = Q
    const val = (apparent_kva * apparent_kva) - (power_kw * power_kw);
    return val > 0 ? Math.sqrt(val) : 0; // kVAR
};

export const calculateLoadFactor = (power_kw, voltage_ln, current) => {
    const theoretical_max = (voltage_ln * current * Math.sqrt(3)) / 1000; 
    if (!theoretical_max || theoretical_max === 0) return 0;
    return power_kw / theoretical_max; 
};

export const checkAlerts = (params) => {
    const alerts = [];
    const pf = parseFloat(params.power_factor) || 1;
    const current = parseFloat(params.current) || 0;
    const vln = parseFloat(params.VLN) || 230;
    const vll = parseFloat(params.VLL) || 400;

    if (pf > 0 && pf < 0.85) {
        alerts.push({ id: 'pf', type: 'Warning', message: `Low Power Factor (${pf}): Reactive losses detected. Install capacitor bank.` });
    }
    if (current > 150) {
        alerts.push({ id: 'current', type: 'Critical', message: `Overload Risk: Current exceeds safe threshold (150A).` });
    }
    if (Math.abs(vln - 230) > 10) {
        alerts.push({ id: 'vln', type: 'Warning', message: `Voltage Deviation: Check supply stability.` });
    }
    if (Math.abs(vll - 400) > 15) {
        alerts.push({ id: 'vll', type: 'Warning', message: `Line Voltage Imbalance detected.` });
    }

    return alerts;
};
