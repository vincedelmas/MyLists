import {APIError} from "better-auth/api";
import {auth} from "@/lib/server/core/auth";
import {MediaType} from "@/lib/utils/enums";
import {createServerFn} from "@tanstack/react-start";
import {getRequest} from "@tanstack/react-start/server";
import {user} from "@/lib/server/database/schema/index";
import {getContainer} from "@/lib/server/core/container";
import {ValidationError} from "@/lib/utils/error-classes";
import {saveUploadedImage} from "@/lib/utils/image-saver";
import {getUserStatsCacheKey} from "@/lib/server/core/cache-keys";
import {transactionMiddleware} from "@/lib/server/middlewares/transaction";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {
    downloadListAsCsvSchema,
    generalSettingsSchema,
    highlightedMediaSearchSchema,
    highlightedMediaSettingsSchema,
    mediaListSettingsSchema,
    PasswordSettingsForm,
    passwordSettingsSchema
} from "@/lib/schemas";


export const postGeneralSettings = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator((data) => generalSettingsSchema.parse(data instanceof FormData ? Object.fromEntries(data.entries()) : data))
    .handler(async ({ data, context: { currentUser } }) => {
        const accountService = await getContainer().then((c) => c.services.account);
        const updatesToApply: Partial<typeof user.$inferInsert> = { privacy: data.privacy };

        if (data.username !== currentUser.name.trim()) {
            await accountService.findUserByName(data.username);
            updatesToApply.name = data.username;
        }

        if (data.profileImage) {
            const profileImageName = await saveUploadedImage({
                file: data.profileImage,
                dirSaveName: "profile-covers",
                resize: { width: 300, height: 300 },
            });
            updatesToApply.image = profileImageName;
        }

        if (data.backgroundImage) {
            const backgroundImageName = await saveUploadedImage({
                file: data.backgroundImage,
                dirSaveName: "profile-back-covers",
                resize: { height: 256 },
            });
            updatesToApply.backgroundImage = backgroundImageName;
        }

        await accountService.updateUserSettings(currentUser.id, updatesToApply);
    });


export const postMediaListSettings = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(mediaListSettingsSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        const accountService = container.services.account;
        const statsService = container.services.stats;

        const toUpdateInUserStats: Partial<Record<MediaType, boolean>> = {
            anime: data.anime,
            games: data.games,
            books: data.books,
            manga: data.manga,
        }

        const toUpdateInUser = {
            ratingSystem: data.ratingSystem,
            gridListView: data.gridListView,
            searchSelector: data.searchSelector,
            autoMoveCompletedTvToOnHold: data.autoMoveCompletedTvToOnHold,
        }

        await accountService.updateUserSettings(currentUser.id, toUpdateInUser);
        await statsService.updateUserMediaListSettings(currentUser.id, toUpdateInUserStats);

        // Re compute user's overview stats
        await container.cacheManager.del(getUserStatsCacheKey(currentUser.id, "overview"))
    });


export const getProfileCustomSettings = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        const profileService = await getContainer().then((c) => c.services.profile);

        const [previews, settings] = await Promise.all([
            profileService.resolveHighlightedMedia(currentUser.id),
            profileService.getHighlightedMediaSettings(currentUser.id),
        ]);

        return { previews, settings };
    });


export const getProfileCustomSearch = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(highlightedMediaSearchSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const profileService = await getContainer().then((c) => c.services.profile);
        return profileService.searchHighlightedMedia(currentUser.id, data.tab, data.query);
    });


export const postProfileCustomSettings = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(highlightedMediaSettingsSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const profileService = await getContainer().then((c) => c.services.profile);
        return profileService.saveHighlightedMediaSettings(currentUser.id, data);
    });


export const getDownloadListAsCSV = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(downloadListAsCsvSchema)
    .handler(async ({ data: { selectedList }, context: { currentUser } }) => {
        const container = await getContainer();
        const mediaService = container.registries.mediaService.get(selectedList);
        return mediaService.downloadMediaListAsCSV(currentUser.id);
    });


export const postPasswordSettings = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(passwordSettingsSchema)
    .handler(async ({ data: { newPassword, currentPassword } }) => {
        try {
            await auth.api.changePassword({
                headers: getRequest().headers,
                body: { newPassword, currentPassword },
            });
        }
        catch (error) {
            if (!(error instanceof APIError) || error.body?.code !== "INVALID_PASSWORD") {
                throw error;
            }

            throw new ValidationError<PasswordSettingsForm>("currentPassword", "Current password incorrect");
        }
    });


export const postDeleteUserAccount = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        const accountService = await getContainer().then((c) => c.services.account);
        return accountService.deleteUserAccount({ userId: currentUser.id, type: "manual" });
    });


export const postUpdateFeatureFlag = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        const accountService = await getContainer().then((c) => c.services.account);
        return accountService.updateFeatureFlag(currentUser.id);
    });
