export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
};

export const formatNumber = (num, decimals = 1) => {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(num);
};

export const formatPercent = (decimal) => {
    return new Intl.NumberFormat('en-US', {
        style: 'percent',
        maximumFractionDigits: 1
    }).format(decimal);
};
