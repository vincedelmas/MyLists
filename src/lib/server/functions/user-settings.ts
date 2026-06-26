import {auth} from "@/lib/server/core/auth";
import {MediaType} from "@/lib/utils/enums";
import {createServerFn} from "@tanstack/react-start";
import {user} from "@/lib/server/database/schema/index";
import {getContainer} from "@/lib/server/core/container";
import {FormattedError} from "@/lib/utils/error-classes";
import {saveUploadedImage} from "@/lib/utils/image-saver";
import {transactionMiddleware} from "@/lib/server/middlewares/transaction";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {
    downloadListAsCsvSchema,
    generalSettingsSchema,
    highlightedMediaSearchSchema,
    highlightedMediaSettingsSchema,
    mediaListSettingsSchema,
    passwordSettingsSchema
} from "@/lib/schemas";


export const postGeneralSettings = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator((data) => generalSettingsSchema.parse(data instanceof FormData ? Object.fromEntries(data.entries()) : data))
    .handler(async ({ data, context: { currentUser } }) => {
        const userService = await getContainer().then((c) => c.services.user);
        const updatesToApply: Partial<typeof user.$inferInsert> = { privacy: data.privacy };

        if (data.username !== currentUser.name.trim()) {
            await userService.findUserByName(data.username);
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

        await userService.updateUserSettings(currentUser.id, updatesToApply);
    });


export const postMediaListSettings = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(mediaListSettingsSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const userService = await getContainer().then(c => c.services.user);
        const userStatsService = await getContainer().then(c => c.services.userStats);

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
        }

        await userService.updateUserSettings(currentUser.id, toUpdateInUser);
        await userStatsService.updateUserMediaListSettings(currentUser.id, toUpdateInUserStats);
    });


export const getProfileCustomSettings = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        const userProfileService = await getContainer().then((c) => c.services.userProfile);

        const [previews, settings] = await Promise.all([
            userProfileService.resolveHighlightedMedia(currentUser.id),
            userProfileService.getHighlightedMediaSettings(currentUser.id),
        ]);

        return { previews, settings };
    });


export const getProfileCustomSearch = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(highlightedMediaSearchSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const userProfileService = await getContainer().then((c) => c.services.userProfile);
        return userProfileService.searchHighlightedMedia(currentUser.id, data.tab, data.query);
    });


export const postProfileCustomSettings = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(highlightedMediaSettingsSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const userProfileService = await getContainer().then((c) => c.services.userProfile);
        return userProfileService.saveHighlightedMediaSettings(currentUser.id, data);
    });


export const getDownloadListAsCSV = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(downloadListAsCsvSchema)
    .handler(async ({ data: { selectedList }, context: { currentUser } }) => {
        const container = await getContainer();
        const mediaService = container.registries.mediaService.getService(selectedList);
        return mediaService.downloadMediaListAsCSV(currentUser.id);
    });


export const postPasswordSettings = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(passwordSettingsSchema)
    .handler(async ({ data: { newPassword, currentPassword }, context: { currentUser } }) => {
        const ctx = await auth.$context;
        const userAccount = await ctx.internalAdapter.findAccount(currentUser.id.toString());

        const isValid = await ctx.password.verify({ hash: userAccount?.password ?? "", password: currentPassword });
        if (!isValid) {
            throw new FormattedError("Current password incorrect");
        }

        const hash = await ctx.password.hash(newPassword);
        await ctx.internalAdapter.updatePassword(currentUser.id.toString(), hash);
    });


export const postDeleteUserAccount = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        const userService = await getContainer().then((c) => c.services.user);
        return userService.deleteUserAccount({ userId: currentUser.id, type: "manual" });
    });


export const postUpdateFeatureFlag = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        const userService = await getContainer().then((c) => c.services.user);
        return userService.updateFeatureFlag(currentUser.id);
    });
