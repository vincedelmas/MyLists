export const getGameAchievementPercent = (unlocked: number | null | undefined, total: number | null | undefined): number | null => {
    if (unlocked == null || total == null || total <= 0) {
        return null;
    }

    return Math.floor((unlocked / total) * 100);
};
