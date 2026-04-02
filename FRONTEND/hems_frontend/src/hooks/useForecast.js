import { useState, useEffect } from 'react';
import { getForecast } from '../api/hemsApi';

export const useForecast = (hours = 72) => {
    const [isLoading, setIsLoading] = useState(true);
    const [forecast, setForecast] = useState([]);
    const [error, setError] = useState(null);

    const fetchForecast = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getForecast(hours);
            setForecast(data);
        } catch (err) {
            setError(err.message || 'Failed to fetch forecast');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchForecast();
    }, [hours]);

    return { forecast, isLoading, error, refetch: fetchForecast };
};
