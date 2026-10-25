import * as z from "zod";
import {getContainer} from "@/lib/server/core/container";
import {getUserStatsCacheKey} from "@/lib/server/core/cache-keys";
import {withTransaction} from "@/lib/server/database/async-storage";
import {ALL_MEDIA_TYPES, getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {mobileImagePath} from "./images";
import {saveUploadedImage} from "@/lib/server/core/images/image-saver";
import {profilePinsRepository} from "@/lib/server/domain/profile/profile-pins.repository";
import {profilePinSchema} from "@/lib/schemas/profile-pins.schema";
import {generalSettingsSchema, mediaListSettingsSchema} from "@/lib/schemas/user-settings.schema";


const imageInputSchema = z.object({ data: z.base64().max(14_000_000), mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]) }).optional();

export const settingsInputSchema = z.discriminatedUnion("section", [
    generalSettingsSchema.pick({ username: true, privacy: true }).extend({ section: z.literal("general"), profileImage: imageInputSchema, backgroundImage: imageInputSchema }),
    mediaListSettingsSchema.extend({ section: z.literal("content") }),
    z.object({ section: z.literal("profile"), showContinue: z.boolean() }),
    profilePinSchema.extend({ section: z.literal("pin") }),
]);


export const getMobileSettings = async (userId: number) => {
    const { services } = await getContainer();

    const user = await services.account.getUserById(userId);
    if (!user) return null;

    return {
        username: user.name,
        image: user.image ? mobileImagePath(user.image) : null,
        backgroundImage: mobileImagePath(user.backgroundImage),
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

        if (data.username !== user.name.trim()) {
            container.services.account.findUserByName(data.username);
        }

        const updates: { name: string; privacy: typeof data.privacy; image?: string; backgroundImage?: string } = { name: data.username, privacy: data.privacy };
        for (const key of ["profileImage", "backgroundImage"] as const) {
            const image = data[key];
            if (!image) continue;
            const file = new File([Buffer.from(image.data, "base64")], "cover", { type: image.mimeType });
            generalSettingsSchema.shape[key].parse(file);
            const filename = await saveUploadedImage({
                file,
                dirSaveName: key === "profileImage" ? "profile-covers" : "profile-back-covers",
                resize: key === "profileImage" ? { width: 300, height: 300 } : { height: 256 }
            });
            if (key === "profileImage") updates.image = filename;
            else updates.backgroundImage = filename;
        }
        container.services.account.updateUserSettings(userId, updates);
    }
    else if (data.section === "profile") {
        const highlights = await container.services.profile.getHighlightedMediaSettings(userId);
        container.services.profile.saveProfileCustomSettings(userId, { ...highlights, showContinue: data.showContinue });
    }
    else if (data.section === "pin") {
        profilePinsRepository.set(userId, { kind: data.kind, id: data.id }, data.pinned);
    }
    else {
        withTransaction(() => {
            container.services.account.updateUserSettings(userId, {
                ratingSystem: data.ratingSystem,
                gridListView: data.gridListView,
                searchSelector: data.searchSelector,
                autoMoveCompletedTvToOnHold: data.autoMoveCompletedTvToOnHold,
            });

            container.services.stats.updateUserMediaListSettings(
                userId,
                { anime: data.anime, books: data.books, manga: data.manga, games: data.games },
                data.releaseNotificationsEnabled,
            );
        });

        await container.cacheManager.del(getUserStatsCacheKey(userId, "overview"));
    }

    return { saved: true };
};

export const getMobileProfileSettings = async (userId: number) => {
    const { services } = await getContainer();
    return { showContinue: await services.profile.getContinueVisibility(userId), pins: profilePinsRepository.getOwn(userId) };
};

export const getMobileAccountSecurity = async (userId: number) => {
    const { services } = await getContainer();
    return services.account.getAccountSecurity(userId);
};
