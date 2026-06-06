import {getContainer} from "@/lib/server/core/container";
import {AdvancedMediaStats} from "@/lib/types/stats.types";
import {MediaType, RatingSystemType} from "@/lib/utils/enums";


export const getPlatformStatsData = async (mediaType?: MediaType) => {
    const userStatsService = await getContainer().then(c => c.services.userStats);

    if (!mediaType) {
        const platformStats = await userStatsService.platformAdvancedStatsSummary();
        return {
            ...platformStats,
            mediaType: undefined,
            ratingSystem: RatingSystemType.SCORE,
            activatedMediaTypes: Object.values(MediaType),
        };
    }

    const mediaStats = await userStatsService.platformMediaAdvancedStats(mediaType);
    return {
        ...mediaStats,
        mediaType,
        ratingSystem: RatingSystemType.SCORE,
        activatedMediaTypes: Object.values(MediaType),
    } as AdvancedMediaStats;
};
