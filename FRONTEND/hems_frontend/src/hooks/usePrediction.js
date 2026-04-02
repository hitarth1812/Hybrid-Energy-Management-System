import { useState } from 'react';
import { predict } from '../api/hemsApi';

export const usePrediction = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [predictionHistory, setPredictionHistory] = useState([]);

    const runPrediction = async (formData) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await predict(formData);
            setResult(res);
            setPredictionHistory(prev => {
                const newHistory = [...prev, { run: prev.length + 1, input: parseFloat(formData.power), predicted: parseFloat(res.predicted_kw) }];
                return newHistory.slice(-10); // Keep last 10
            });
            return res;
        } catch (err) {
            setError(err.message || 'Prediction failed');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const clearHistory = () => {
        setPredictionHistory([]);
        setResult(null);
        setError(null);
    };

    return { runPrediction, isLoading, result, error, predictionHistory, clearHistory };
};
