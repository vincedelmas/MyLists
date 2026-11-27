export const calculateMediaLevel = (totalTime: number) => {
    if (!Number.isFinite(totalTime) || totalTime <= 0) return 0;
    return (Math.sqrt(400 + 80 * totalTime) - 20) / 40;
};


export const timeRequiredForLevel = (level: number) => {
    if (!Number.isFinite(level) || level <= 0) return 0;
    return 20 * level * (level + 1);
};
