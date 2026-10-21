import {clientEnv} from "@/env/client";
import {getContainer} from "@/lib/server/core/container";
import {dateFromUTCInput} from "@/lib/utils/formatting/date";


const imagePath = (url: string) => {
    return new URL(url, clientEnv.VITE_BASE_URL).pathname;
}


export const getMobileProfile = async (userId: number) => {
    const { services } = await getContainer();
    const user = await services.account.getUserById(userId);
    if (!user) return null;

    const [social, stats, lists, highlights] = await Promise.all([
        services.social.getFollowCount(userId),
        services.stats.userPreComputedStatsSummary(userId),
        services.stats.userPerMediaSummaryStats(userId),
        services.profile.resolveHighlightedMedia(userId),
    ]);

    return {
        social,
        lists: lists.map(({ mediaType, entriesFavorites, timeSpent, totalEntries }) => ({
            mediaType,
            timeSpent,
            totalEntries,
            entriesFavorites,
        })),
        user: {
            id: user.id,
            name: user.name,
            privacy: user.privacy,
            ratingSystem: user.ratingSystem,
            image: user.image ? imagePath(user.image) : null,
            backgroundImage: imagePath(user.backgroundImage),
            createdAt: dateFromUTCInput(user.createdAt).toISOString(),
        },
        stats: {
            avgRated: stats.avgRated,
            totalHours: stats.totalHours,
            totalRated: stats.totalRated,
            totalEntries: stats.totalEntries,
            totalFavorites: stats.totalFavorites,
        },
        highlights: {
            mode: highlights.overview.mode,
            title: highlights.overview.title,
            items: highlights.overview.items.map(({ mediaId, mediaType, mediaName, mediaCover }) => ({
                mediaId,
                mediaType,
                mediaName,
                mediaCover: imagePath(mediaCover),
            })),
        },
    };
};


export const getMobileProfileActivity = async (userId: number) => {
    const { services } = await getContainer();
    const updates = await services.updateHistory.getUserUpdates(userId);

    return updates.map(update => ({
        ...update,
        timestamp: dateFromUTCInput(update.timestamp).toISOString(),
    }));
};
