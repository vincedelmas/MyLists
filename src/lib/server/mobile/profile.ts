import * as z from "zod";
import {toActor} from "@/lib/server/authorization";
import {calculateMediaLevel} from "@/lib/utils/media/level";
import {mediaTypeFieldSchema} from "@/lib/schemas/common.schema";
import {InactiveMediaTypeError} from "@/lib/utils/error-classes";
import {getUserStatsCacheKey, ONE_HOUR_CACHE_TTL_MS} from "@/lib/server/core/cache-keys";
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
            level: calculateMediaLevel(timeSpent * 60),
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

export const statsTabSchema = z.union([z.literal("overview"), mediaTypeFieldSchema]).default("overview");

export const getMobileStats = async (userId: number, tab: z.infer<typeof statsTabSchema> = "overview") => {
    const {services, cacheManager} = await getContainer();
    const user = (await services.account.getUserById(userId))!;
    const activatedMediaTypes = user.userMediaSettings
        .filter((setting) => setting.active)
        .map((setting) => setting.mediaType);
    if (tab !== "overview" && !activatedMediaTypes.includes(tab)) throw new InactiveMediaTypeError(tab);
    const context = {activatedMediaTypes, ratingSystem: user.ratingSystem};
    if (tab === "overview") {
        const stats = await cacheManager.wrap(
            getUserStatsCacheKey(userId, tab),
            () => services.stats.userAdvancedSummaryStats(userId),
            {ttl: ONE_HOUR_CACHE_TTL_MS},
        );
        return {...stats, ...context, kind: "overview" as const};
    }
    const stats = await cacheManager.wrap(
        getUserStatsCacheKey(userId, tab),
        () => services.stats.userAdvancedMediaStats(userId, tab),
        {ttl: ONE_HOUR_CACHE_TTL_MS},
    );
    return {...stats, ...context, kind: "media" as const, mediaType: tab};
};

export const getMobileProfileExtras = async (userId: number) => {
    const {services} = await getContainer();
    const [achievements, followsFeed] = await Promise.all([
        services.achievements.getAchievementsDetails(userId, 3),
        services.updateHistory.getFollowsUpdates(userId, toActor({id: userId}), 10),
    ]);
    return {
        achievements: achievements.map((item) => ({
            ...item,
            completedAt: item.completedAt ? dateFromUTCInput(item.completedAt).toISOString() : null,
        })),
        followsFeed: followsFeed.map((item) => ({...item, timestamp: dateFromUTCInput(item.timestamp).toISOString()})),
    };
};

export const getMobileAchievements = async (userId: number) => {
    const {services} = await getContainer();
    const [items, user] = await Promise.all([
        services.achievements.getUserAchievements(userId),
        services.account.getUserById(userId),
    ]);
    const active = new Set(
        user!.userMediaSettings.filter((setting) => setting.active).map((setting) => setting.mediaType),
    );
    return items
        .filter((item) => active.has(item.mediaType))
        .map((item) => ({
            ...item,
            tiers: item.tiers.map((tier) => ({
                ...tier,
                completedAt: tier.completedAt ? dateFromUTCInput(tier.completedAt).toISOString() : null,
            })),
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
