const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Mock sleep function for simulating latency in dev
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const predict = async (params) => {
    // POST /predict
    // Body: { power, power_factor, VLN, VLL, current, frequency }
    
    // Fallback Mock Logic
    await delay(1200);
    
    if (Math.random() < 0.05) throw new Error("API Connection Timeout");

    // Simple pseudo-prediction
    const power = parseFloat(params.power) || 0;
    const predicted_kw_num = parseFloat((power * 1.05).toFixed(2));
    
    return {
        predicted_kw: predicted_kw_num.toFixed(2),
        status: predicted_kw_num > 90 ? 'High' : predicted_kw_num > 50 ? 'Moderate' : 'Normal',
        cost_inr: (predicted_kw_num * 7.5).toFixed(2),
        carbon_kg: (predicted_kw_num * 0.85).toFixed(2)
    };
};

export const predictLight = async (params) => {
    try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${BASE_URL}/api/energy/predict/light/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` })
            },
            body: JSON.stringify({
                ...params,
                hour: new Date().getHours(),
                // Map JS getDay() (0=Sun) → Python weekday() (0=Mon)
                day_of_week: (new Date().getDay() + 6) % 7,
                month: new Date().getMonth() + 1,
                // Correctly flag both Sat (getDay=6) and Sun (getDay=0) as weekend
                is_weekend: [0, 6].includes(new Date().getDay()) ? 1 : 0,
                power_lag_1: params.power || 0,
                power_lag_5: params.power || 0,
                power_lag_10: params.power || 0,
                rolling_mean_5: params.power || 0,
                rolling_std_5: 0
            }),
        });
        if (!res.ok) throw new Error("Fallback");
        const data = await res.json();
        return {
            predicted_kw: data.predicted_power_kw.toFixed(2),
            status: data.predicted_power_kw > 30 ? 'High' : data.predicted_power_kw > 15 ? 'Moderate' : 'Normal',
            cost_inr: (data.predicted_power_kw * 7.5).toFixed(2),
            carbon_kg: data.predicted_co2_kg.toFixed(2)
        };
    } catch {
        await delay(1200);
        const power = parseFloat(params.power) || 0;
        const predicted_kw_num = parseFloat((power * 0.35).toFixed(2)); // Lights ~35%
        
        return {
            predicted_kw: predicted_kw_num.toFixed(2),
            status: predicted_kw_num > 30 ? 'High' : predicted_kw_num > 15 ? 'Moderate' : 'Normal',
            cost_inr: (predicted_kw_num * 7.5).toFixed(2),
            carbon_kg: (predicted_kw_num * 0.85).toFixed(2)
        };
    }
};

export const getForecast = async (hours = 72) => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const token = localStorage.getItem('access_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch(`${BASE_URL}/forecast?hours=${hours}`, { 
            signal: controller.signal,
            headers 
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error("Backend not OK");
        return await res.json();
    } catch {
        // Fallback Mock
        await delay(800);
        const data = [];
        const now = new Date();
        for (let i = 0; i < hours; i++) {
            const time = new Date(now.getTime() + i * 3600000);
            const baseActual = Math.random() * 50 + 20;
            const basePredicted = baseActual + (Math.random() * 10 - 5);
            const is_peak = time.getHours() >= 14 && time.getHours() <= 16;
            data.push({
                timestamp: time.toISOString(),
                actual_kwh: i < 24 ? Math.round(baseActual) : null,
                predicted_kwh: Math.round(basePredicted + (is_peak ? 30 : 0)),
                is_peak
            });
        }
        return data;
    }
};

export const getAnalytics = async (granularity = 'daily', selectedDate = null) => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const dateQuery = selectedDate ? `&date=${selectedDate}` : '';
        const token = localStorage.getItem('access_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch(`${BASE_URL}/analytics?granularity=${granularity}${dateQuery}`, { 
            signal: controller.signal,
            headers 
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error("Backend not OK");
        return await res.json();
    } catch {
        // Fallback Mock
        await delay(1000);
        
        const heatmap_matrix = Array(7).fill(0).map(() => 
            Array(24).fill(0).map((_, hour) => {
                if (hour >= 14 && hour <= 18) return Math.random() * 0.5 + 0.5;
                return Math.random() * 0.4;
            })
        );

        const consumption_series = [];
        const co2_series = [];
        
        const isHourly = granularity === 'hourly';
        const pts = isHourly ? 24 : (granularity === 'weekly' ? 12 : 30);
        const stepMs = isHourly ? 3600000 : (granularity === 'weekly' ? 86400000 * 7 : 86400000);
        
        let baseDate;
        if (selectedDate) {
            // Treat the manually entered date as local
            const [yyyy, mm, dd] = selectedDate.split('-');
            const manualDate = new Date(yyyy, mm - 1, dd);
            
            if (isHourly) {
                // If hourly and manual date, start at 00:00 of that day
                baseDate = new Date(manualDate.setHours(0, 0, 0, 0));
            } else {
                // If daily/weekly, treat manual date as the end date
                baseDate = new Date(manualDate.getTime() - (pts - 1) * stepMs);
            }
        } else {
            if (isHourly) {
                // past 24 hours from now
                baseDate = new Date();
                baseDate.setHours(baseDate.getHours() - 23, 0, 0, 0);
            } else {
                // past 30 days / 12 weeks from now
                baseDate = new Date(Date.now() - (pts - 1) * stepMs);
            }
        }

        for(let i=0; i<pts; i++) {
            const t = new Date(baseDate.getTime() + i * stepMs);
            
            // create realistic curve
            const hour = t.getHours();
            const peakFactor = isHourly ? Math.max(0, Math.sin((hour - 8) * Math.PI / 12)) : 0.5;
            const val = 40 + (peakFactor * 80) + (Math.random() * 20);
            
            consumption_series.push({ timestamp: t.toISOString(), consumption_kwh: val });
            co2_series.push({ timestamp: t.toISOString(), co2_kg: val * 0.8 });
        }

        return {
            total_kwh: 12450.5,
            total_cost_inr: 85300,
            total_co2_kg: 9800.4,
            efficiency_score: 82,
            peak_demand_kw: 145,
            peak_hour: 15,
            pf_avg: 0.82,
            night_usage_pct: 32,
            consumption_series,
            co2_series,
            heatmap_matrix,
            anomalies: [
                { id: 1, timestamp: new Date().toISOString(), type: 'spike', magnitude: '+45%', description: 'Sudden load spike detected on main feeder' },
                { id: 2, timestamp: new Date(Date.now() - 86400000).toISOString(), type: 'voltage_event', magnitude: '-15V', description: 'Voltage sag detected Phase B' }
            ]
        };
    }
};
