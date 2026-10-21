import {mobileImagePath} from "./images";
import {getContainer} from "@/lib/server/core/container";
import {dateFromUTCInput} from "@/lib/utils/formatting/date";

export const getMobileProfile = async (userId: number) => {
    const {services} = await getContainer();
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
        lists: lists.map(({mediaType, entriesFavorites, timeSpent, totalEntries}) => ({
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
            image: user.image ? mobileImagePath(user.image) : null,
            backgroundImage: mobileImagePath(user.backgroundImage),
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
            items: highlights.overview.items.map(({mediaId, mediaType, mediaName, mediaCover}) => ({
                mediaId,
                mediaType,
                mediaName,
                mediaCover: mobileImagePath(mediaCover),
            })),
        },
    };
};

export const getMobileProfileActivity = async (userId: number) => {
    const {services} = await getContainer();
    const updates = await services.updateHistory.getUserUpdates(userId);

    return updates.map((update) => ({
        ...update,
        timestamp: dateFromUTCInput(update.timestamp).toISOString(),
    }));
};

export const getMobileStats = async (userId: number) => {
    const {services} = await getContainer();
    const items = await services.stats.userPerMediaSummaryStats(userId);
    return items.map(({mediaType, totalEntries, timeSpent, entriesFavorites, entriesRated, statusList}) => ({
        mediaType,
        totalEntries,
        timeSpent,
        entriesFavorites,
        entriesRated,
        statusList: statusList.map(({status, count}) => ({status, count})),
    }));
};

export const getMobileAchievements = async (userId: number) => {
    const {services} = await getContainer();
    const items = await services.achievements.getAchievementsDetails(userId);
    return items.map((item) => ({
        ...item,
        completedAt: item.completedAt ? dateFromUTCInput(item.completedAt).toISOString() : null,
    }));
};

export const getMobileHistory = async (userId: number, page: number) => {
    const {services} = await getContainer();
    const [result, user] = await Promise.all([
        services.updateHistory.getUserUpdatesPaginated({page, perPage: 30}, userId),
        services.account.getUserById(userId),
    ]);
    return {
        ...result,
        ratingSystem: user!.ratingSystem,
        page,
        pages: Math.ceil(result.total / 30),
        items: result.items.map((item) => ({...item, timestamp: dateFromUTCInput(item.timestamp).toISOString()})),
    };
};
