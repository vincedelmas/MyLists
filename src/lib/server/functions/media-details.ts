import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {FormattedError} from "@/lib/utils/error-classes";
import {dateFromUTCInput} from "@/lib/utils/date-formatting";
import {isAtLeastRole, MediaType, RoleType} from "@/lib/utils/enums";
import {tryFormZodError, tryNotFound} from "@/lib/utils/try-not-found";
import {transactionMiddleware} from "@/lib/server/middlewares/transaction";
import {publicAuthMiddleware, requiredAuthAndManagerRoleMiddleware, requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {
    editMediaDetailsSchema,
    jobDetailsSchema,
    mediaActionSchema,
    mediaDetailsSchema,
    mediaDetailsToEditSchema,
    refreshMediaDetailsSchema,
    updateBookCoverSchema
} from "@/lib/schemas";


export const getMediaDetails = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware, transactionMiddleware])
    .inputValidator(tryNotFound(mediaDetailsSchema))
    .handler(async ({ data: { mediaType, mediaId, external }, context: { currentUser } }) => {
        const container = await getContainer();
        const mediaService = container.registries.mediaService.getService(mediaType);
        const mediaProviderService = container.registries.mediaProviderService.getService(mediaType);

        const {
            media,
            userMedia,
            followsData,
            similarMedia,
        } = await mediaService.getMediaAndUserDetails(currentUser?.id, mediaId, external, mediaProviderService);

        return { media, userMedia, followsData, similarMedia };
    });


export const getJobDetails = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .inputValidator(tryNotFound(jobDetailsSchema))
    .handler(async ({ data: { mediaType, job, name, search }, context: { currentUser } }) => {
        const container = await getContainer();
        const mediaService = container.registries.mediaService.getService(mediaType);
        return mediaService.getMediaJobDetails(job, name, search, currentUser?.id);
    });


export const refreshMediaDetails = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .inputValidator(refreshMediaDetailsSchema)
    .handler(async ({ data: { mediaType, apiId }, context: { currentUser } }) => {
        const container = await getContainer();
        const adminService = container.services.admin;
        const mediaService = container.registries.mediaService.getService(mediaType);
        const mediaProviderService = container.registries.mediaProviderService.getService(mediaType);

        const isManagerOrAbove = isAtLeastRole(currentUser.role as RoleType, RoleType.MANAGER);
        if (!isManagerOrAbove) {
            if (mediaType === MediaType.BOOKS) {
                throw new FormattedError("Unauthorized to refresh book metadata.");
            }

            const media = await mediaService.findByApiId(apiId);
            if (media?.lastApiUpdate) {
                const lastUpdateTime = dateFromUTCInput(media.lastApiUpdate).getTime();
                // 24 hours cooldown
                const nextAvailableRefresh = lastUpdateTime + (24 * 60 * 60 * 1000);

                if (Date.now() < nextAvailableRefresh) {
                    throw new FormattedError("You can refresh metadata once every 24 hours.");
                }
            }
        }

        await mediaProviderService.fetchAndRefreshMediaDetails(apiId);
        void adminService.logMediaRefresh({ userId: currentUser.id, mediaType, apiId }).catch();
    });


export const getGameCompatiblePlatforms = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .inputValidator(tryNotFound(mediaActionSchema))
    .handler(async ({ data: { mediaType, mediaId } }) => {
        const container = await getContainer();
        const gamesService = container.registries.mediaService.getService(MediaType.GAMES);

        if (mediaType !== MediaType.GAMES) {
            throw new FormattedError("Platform lookup is only available for games ;).");
        }

        return gamesService.getCompatiblePlatforms(mediaId);
    });


export const postUpdateBookCover = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .inputValidator(tryFormZodError(updateBookCoverSchema))
    .handler(async ({ data: { apiId, imageUrl, imageFile } }) => {
        const container = await getContainer();
        const mediaService = container.registries.mediaService.getService(MediaType.BOOKS);
        await mediaService.updateDefaultCover(apiId, { imageUrl, imageFile });
    });


export const getMediaDetailsToEdit = createServerFn({ method: "GET" })
    .middleware([requiredAuthAndManagerRoleMiddleware, transactionMiddleware])
    .inputValidator(tryNotFound(mediaDetailsToEditSchema))
    .handler(async ({ data: { mediaType, mediaId } }) => {
        const container = await getContainer();
        const mediaService = container.registries.mediaService.getService(mediaType);
        return mediaService.getMediaEditableFields(mediaId);
    });


export const postEditMediaDetails = createServerFn({ method: "POST" })
    .middleware([requiredAuthAndManagerRoleMiddleware, transactionMiddleware])
    .inputValidator(tryFormZodError(editMediaDetailsSchema))
    .handler(async ({ data: { mediaType, mediaId, payload } }) => {
        const container = await getContainer();
        const mediaService = container.registries.mediaService.getService(mediaType);
        return mediaService.updateMediaEditableFields(mediaId, payload);
    });
