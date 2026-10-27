import * as z from "zod";
import {inArray} from "drizzle-orm";
import {user as userTable} from "@/lib/server/database/schema";
import {getDbClient} from "@/lib/server/database/async-storage";
import {withMobileActivityCovers} from "./activity";
import {toActor} from "@/lib/server/authorization";
import {getContainer} from "@/lib/server/core/container";
import {mobileImagePath} from "@/lib/server/mobile/images";
import {calculateMediaLevel} from "@/lib/utils/media/level";
import {dateFromUTCInput} from "@/lib/utils/formatting/date";
import {mediaTypeFieldSchema} from "@/lib/schemas/common.schema";
import {getProfilePinnedItems} from "@/lib/server/domain/profile/profile-pins.queries";
import {deleteUserUpdatesSchema} from "@/lib/schemas/user-media.schema";
import {InactiveMediaTypeError} from "@/lib/utils/error-classes";
import {getUserStatsCacheKey, ONE_HOUR_CACHE_TTL_MS} from "@/lib/server/core/cache-keys";

export const statsTabSchema = z.union([z.literal("overview"), mediaTypeFieldSchema]).default("overview");

export const getMobileProfile = async (userId: number) => {
    const { services } = await getContainer();

    const user = await services.account.getUserById(userId);
    if (!user) return null;

    const [social, lists, summary] = await Promise.all([
        services.social.getFollowCount(userId),
        services.stats.userPerMediaSummaryStats(userId),
        services.stats.userPreComputedStatsSummary(userId),
    ]);

    return {
        social,
        summary: { totalDays: summary.totalDays, totalEntries: summary.totalEntries, avgRated: summary.avgRated, percentRated: summary.percentRated },
        lists: lists.map(({ mediaType, entriesFavorites, timeSpent, totalEntries }) => ({
            mediaType,
            timeSpent,
            totalEntries,
            entriesFavorites,
            level: calculateMediaLevel(timeSpent * 60),
        })),
        user: {
            id: user.id,
            level: Math.floor(
                calculateMediaLevel(
                    user.userMediaSettings
                        .filter((setting) => setting.active)
                        .reduce((sum, setting) => sum + setting.timeSpent, 0),
                ),
            ),
            name: user.name,
            privacy: user.privacy,
            ratingSystem: user.ratingSystem,
            image: user.image ? mobileImagePath(user.image) : null,
            backgroundImage: mobileImagePath(user.backgroundImage),
            createdAt: dateFromUTCInput(user.createdAt).toISOString(),
        },
    };
};

export const getMobileProfileActivity = async (userId: number) => {
    const { services } = await getContainer();
    const updates = await services.updateHistory.getUserUpdates(userId);

    return withMobileActivityCovers(updates).map((update) => ({
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

export const getMobileProfileExtras = async (userId: number, viewerId = userId) => {
    const { services } = await getContainer();
    const followsFeed = await services.updateHistory.getFollowsUpdates(userId, toActor({ id: viewerId }), 10);

    const ids = [...new Set(followsFeed.map((item) => item.userId))];
    const people = ids.length
        ? getDbClient()
            .select({ id: userTable.id, image: userTable.image, ratingSystem: userTable.ratingSystem })
            .from(userTable)
            .where(inArray(userTable.id, ids))
            .all()
        : [];
    const authors = new Map(people.map((person) => [person.id, person]));
    const pinnedItems = await getProfilePinnedItems(userId, toActor({ id: viewerId }));
    const pins = pinnedItems.map(item => item.kind === "dynamic"
        ? { kind: item.kind, id: item.view.id, title: item.view.spec.title, total: item.preview.total }
        : { kind: item.kind, id: item.collection.id, title: item.collection.title, total: item.collection.itemsCount });

    return {
        pins,
        followsFeed: withMobileActivityCovers(followsFeed).map((item) => {
            const author = authors.get(item.userId)!;
            return {
                ...item,
                avatar: author.image ? mobileImagePath(author.image) : null,
                ratingSystem: author.ratingSystem,
                timestamp: dateFromUTCInput(item.timestamp).toISOString(),
            };
        }),
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

export const getMobileHistory = async (userId: number, page: number, search?: string) => {
    const { services } = await getContainer();

    const [user, result] = await Promise.all([
        services.account.getUserById(userId),
        services.updateHistory.getUserUpdatesPaginated({ page, perPage: 30, search }, userId),
    ]);

    return {
        ...result,
        page,
        ratingSystem: user!.ratingSystem,
        pages: Math.ceil(result.total / 30),
        items: withMobileActivityCovers(result.items).map((item) => ({
            ...item,
            timestamp: dateFromUTCInput(item.timestamp).toISOString(),
        })),
    };
};

export const deleteMobileHistory = async (userId: number, input: z.infer<typeof deleteUserUpdatesSchema>) => {
    const { services } = await getContainer();
    await services.updateHistory.deleteUserUpdates(userId, input.updateIds, false);
    return { deleted: true };
};
