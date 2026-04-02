import { useState, useEffect } from 'react';
import { getAnalytics } from '../api/hemsApi';

export const useAnalytics = (initialGranularity = 'daily') => {
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [granularity, setGranularity] = useState(initialGranularity);
    const [selectedDate, setSelectedDate] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        const fetchAnalytics = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await getAnalytics(granularity, selectedDate);
                if (!controller.signal.aborted) setData(res);
            } catch (err) {
                if (!controller.signal.aborted)
                    setError(err.message || 'Failed to fetch analytics');
            } finally {
                if (!controller.signal.aborted) setIsLoading(false);
            }
        };

        fetchAnalytics();
        return () => controller.abort();
    }, [granularity, selectedDate]);

    return { data, isLoading, error, granularity, setGranularity, selectedDate, setSelectedDate };
};
