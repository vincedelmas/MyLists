import * as z from "zod";
import {toActor} from "@/lib/server/authorization";
import {getContainer} from "@/lib/server/core/container";
import {mobileImagePath} from "@/lib/server/mobile/images";
import {calculateMediaLevel} from "@/lib/utils/media/level";
import {dateFromUTCInput} from "@/lib/utils/formatting/date";
import {mediaTypeFieldSchema} from "@/lib/schemas/common.schema";
import {InactiveMediaTypeError} from "@/lib/utils/error-classes";
import {getUserStatsCacheKey, ONE_HOUR_CACHE_TTL_MS} from "@/lib/server/core/cache-keys";


export const statsTabSchema = z.union([z.literal("overview"), mediaTypeFieldSchema]).default("overview");


export const getMobileProfile = async (userId: number) => {
    const { services } = await getContainer();

    const user = await services.account.getUserById(userId);
    if (!user) return null;

    const [social, lists, highlights] = await Promise.all([
        services.social.getFollowCount(userId),
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
            level: calculateMediaLevel(timeSpent * 60),
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
        highlights: {
            mode: highlights.overview.mode,
            title: highlights.overview.title,
            items: highlights.overview.items.map(({ mediaId, mediaType, mediaName, mediaCover }) => ({
                mediaId,
                mediaType,
                mediaName,
                mediaCover: mobileImagePath(mediaCover),
            })),
        },
    };
};


export const getMobileProfileActivity = async (userId: number) => {
    const { services } = await getContainer();
    const updates = await services.updateHistory.getUserUpdates(userId);

    return updates.map((update) => ({
        ...update,
        timestamp: dateFromUTCInput(update.timestamp).toISOString(),
    }));
};


export const getMobileStats = async (userId: number, tab: z.infer<typeof statsTabSchema> = "overview") => {
    const { services, cacheManager } = await getContainer();
    const user = (await services.account.getUserById(userId))!;

    const activatedMediaTypes = user.userMediaSettings
        .filter((setting) => setting.active)
        .map((setting) => setting.mediaType);

    if (tab !== "overview" && !activatedMediaTypes.includes(tab)) {
        throw new InactiveMediaTypeError(tab);
    }

    const context = { activatedMediaTypes, ratingSystem: user.ratingSystem };

    if (tab === "overview") {
        const stats = await cacheManager.wrap(
            getUserStatsCacheKey(userId, tab),
            () => services.stats.userAdvancedSummaryStats(userId),
            { ttl: ONE_HOUR_CACHE_TTL_MS },
        );

        return { ...stats, ...context, kind: "overview" as const };
    }

    const stats = await cacheManager.wrap(
        getUserStatsCacheKey(userId, tab),
        () => services.stats.userAdvancedMediaStats(userId, tab),
        { ttl: ONE_HOUR_CACHE_TTL_MS },
    );

    return { ...stats, ...context, kind: "media" as const, mediaType: tab };
};


export const getMobileProfileExtras = async (userId: number) => {
    const { services } = await getContainer();
    const followsFeed = await services.updateHistory.getFollowsUpdates(userId, toActor({ id: userId }), 10);

    return {
        followsFeed: followsFeed.map((item) => ({
            ...item,
            timestamp: dateFromUTCInput(item.timestamp).toISOString(),
        })),
    };
};


export const getMobileRecentAchievements = async (userId: number) => {
    const { services } = await getContainer();
    const items = await services.achievements.getAchievementsDetails(userId, 3);
    return items.map((item) => ({
        ...item,
        completedAt: item.completedAt ? dateFromUTCInput(item.completedAt).toISOString() : null,
    }));
};


export const getMobileAchievements = async (userId: number) => {
    const { services } = await getContainer();

    const [user, items] = await Promise.all([
        services.account.getUserById(userId),
        services.achievements.getUserAchievements(userId),
    ]);

    const active = new Set(user!.userMediaSettings.filter((s) => s.active).map((s) => s.mediaType));

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
    const { services } = await getContainer();

    const [user, result] = await Promise.all([
        services.account.getUserById(userId),
        services.updateHistory.getUserUpdatesPaginated({ page, perPage: 30 }, userId),
    ]);

    return {
        ...result,
        page,
        ratingSystem: user!.ratingSystem,
        pages: Math.ceil(result.total / 30),
        items: result.items.map((item) => ({
            ...item,
            timestamp: dateFromUTCInput(item.timestamp).toISOString(),
        })),
    };
};
