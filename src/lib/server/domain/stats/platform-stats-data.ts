import {StatsActiveTab} from "@/lib/schemas";
import {getContainer} from "@/lib/server/core/container";
import {AdvancedMediaStats} from "@/lib/types/stats.types";
import {MEDIA_TYPES, RatingSystemType} from "@/lib/utils/enums";


export const getPlatformStatsData = async (activeTab: StatsActiveTab) => {
    const userStatsService = await getContainer().then(c => c.stats);

    if (activeTab === "overview") {
        const platformStats = await userStatsService.platformAdvancedStatsSummary();
        return {
            ...platformStats,
            mediaType: undefined,
            ratingSystem: RatingSystemType.SCORE,
            activatedMediaTypes: [...MEDIA_TYPES],
        };
    }

    const mediaStats = await userStatsService.platformMediaAdvancedStats(activeTab);
    return {
        ...mediaStats,
        mediaType: activeTab,
        ratingSystem: RatingSystemType.SCORE,
        activatedMediaTypes: [...MEDIA_TYPES],
    } as AdvancedMediaStats;
};
