import * as z from "zod";
import {getContainer} from "@/lib/server/core/container";
import {generalSettingsSchema, mediaListSettingsSchema} from "@/lib/schemas/user-settings.schema";
import {withTransaction} from "@/lib/server/database/async-storage";
import {getUserStatsCacheKey} from "@/lib/server/core/cache-keys";
import {ALL_MEDIA_TYPES, getMediaDefinition} from "@/lib/media-definitions/definition.registry";

export const settingsInputSchema = z.discriminatedUnion("section", [
    generalSettingsSchema.pick({username: true, privacy: true}).extend({section: z.literal("general")}),
    mediaListSettingsSchema.extend({section: z.literal("content")}),
]);

export const getMobileSettings = async (userId: number) => {
    const {services} = await getContainer();
    const user = await services.account.getUserById(userId);
    if (!user) return null;
    return {
        username: user.name,
        privacy: user.privacy,
        ratingSystem: user.ratingSystem,
        gridListView: user.gridListView,
        searchSelector: user.searchSelector,
        autoMoveCompletedTvToOnHold: user.autoMoveCompletedTvToOnHold,
        lists: ALL_MEDIA_TYPES.map((mediaType) => {
            const setting = user.userMediaSettings.find((item) => item.mediaType === mediaType)!;
            return {
                mediaType,
                active: setting.active,
                releaseNotificationsEnabled: setting.releaseNotificationsEnabled,
                supportsNotifications: getMediaDefinition(mediaType).releaseNotifications,
            };
        }),
    };
};

export const saveMobileSettings = async (userId: number, data: z.infer<typeof settingsInputSchema>) => {
    const container = await getContainer();
    if (data.section === "general") {
        const user = await container.services.account.getUserById(userId);
        if (!user) return null;
        if (data.username !== user.name.trim()) container.services.account.findUserByName(data.username);
        container.services.account.updateUserSettings(userId, {name: data.username, privacy: data.privacy});
    } else {
        withTransaction(() => {
            container.services.account.updateUserSettings(userId, {
                ratingSystem: data.ratingSystem,
                gridListView: data.gridListView,
                searchSelector: data.searchSelector,
                autoMoveCompletedTvToOnHold: data.autoMoveCompletedTvToOnHold,
            });
            container.services.stats.updateUserMediaListSettings(
                userId,
                {anime: data.anime, books: data.books, manga: data.manga, games: data.games},
                data.releaseNotificationsEnabled,
            );
        });
        await container.cacheManager.del(getUserStatsCacheKey(userId, "overview"));
    }
    return {saved: true};
};
