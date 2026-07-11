import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {FormattedError} from "@/lib/utils/error-classes";
import {dateFromUTCInput} from "@/lib/utils/date-formatting";
import {isAtLeastRole, MediaType, RoleType} from "@/lib/utils/enums";
import {transactionMiddleware} from "@/lib/server/middlewares/transaction";
import {publicAuthMiddleware, requiredAuthAndManagerRoleMiddleware, requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {
    editMediaDetailsSchema,
    externalMediaResolveSchema,
    jobDetailsSchema,
    mediaCommunityActivitySchema,
    mediaDetailsSchema,
    mediaDetailsToEditSchema,
    mediaTypeMediaIdSchema,
    refreshMediaDetailsSchema,
    updateBookCoverSchema
} from "@/lib/schemas";


export const getMediaDetails = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware, transactionMiddleware])
    .validator(mediaDetailsSchema)
    .handler(async ({ data: { mediaType, mediaId }, context: { currentUser } }) => {
        const container = await getContainer();
        const mediaService = container.registries.mediaService.get(mediaType);

        const {
            media,
            userMedia,
            followsData,
            similarMedia,
        } = await mediaService.getMediaAndUserDetails(currentUser?.id, mediaId);

        return { media, userMedia, followsData, similarMedia };
    });


export const getMediaCommunityActivity = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware, transactionMiddleware])
    .validator(mediaCommunityActivitySchema)
    .handler(async ({ data: { mediaType, mediaId, search }, context: { currentUser } }) => {
        const container = await getContainer();
        const mediaService = container.registries.mediaService.get(mediaType);
        return mediaService.getMediaCommunityActivity(currentUser?.id, mediaId, search);
    });


export const resolveExternalMedia = createServerFn({ method: "POST" })
    .middleware([publicAuthMiddleware, transactionMiddleware])
    .validator(externalMediaResolveSchema)
    .handler(async ({ data: { mediaType, apiId } }) => {
        const container = await getContainer();
        const ingestionService = container.registries.ingestionServices.get(mediaType);
        const mediaId = await ingestionService.storeFromExternal(apiId);
        return { mediaId };
    });


export const getJobDetails = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .validator(jobDetailsSchema)
    .handler(async ({ data: { mediaType, job, name, pagination }, context: { currentUser } }) => {
        const container = await getContainer();
        const mediaService = container.registries.mediaService.get(mediaType);
        return mediaService.getMediaJobDetails(job, name, pagination, currentUser?.id);
    });


export const refreshMediaDetails = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(refreshMediaDetailsSchema)
    .handler(async ({ data: { mediaType, mediaId }, context: { currentUser } }) => {
        const container = await getContainer();
        const adminService = container.services.admin;
        const mediaService = container.registries.mediaService.get(mediaType);
        const isManagerOrAbove = isAtLeastRole(currentUser.role as RoleType, RoleType.MANAGER);
        const ingestionService = container.registries.ingestionServices.get(mediaType);

        if (!isManagerOrAbove && mediaType === MediaType.BOOKS) {
            throw new FormattedError("Unauthorized to refresh book metadata.");
        }

        const media = await mediaService.findById(mediaId);
        if (!media) throw new FormattedError("Media not found, cannot refresh metadata.");

        if (!isManagerOrAbove && media.lastApiUpdate) {
            const lastUpdateTime = dateFromUTCInput(media.lastApiUpdate).getTime();
            const nextAvailableRefresh = lastUpdateTime + (24 * 60 * 60 * 1000); // 24 hours cooldown

            if (Date.now() < nextAvailableRefresh) {
                throw new FormattedError("You can refresh metadata once every 24 hours.");
            }
        }

        await ingestionService.refreshFromExternal(media.apiId);
        void adminService.logMediaRefresh({ userId: currentUser.id, mediaType, apiId: media.apiId }).catch();
    });


export const getGameCompatiblePlatforms = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(mediaTypeMediaIdSchema)
    .handler(async ({ data: { mediaType, mediaId } }) => {
        const container = await getContainer();
        const gamesService = container.registries.mediaService.get(MediaType.GAMES);

        if (mediaType !== MediaType.GAMES) {
            throw new FormattedError("Platform lookup is only available for games ;).");
        }

        return gamesService.getCompatiblePlatforms(mediaId);
    });


export const postUpdateBookCover = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator((data) => updateBookCoverSchema.parse(data instanceof FormData ? Object.fromEntries(data.entries()) : data))
    .handler(async ({ data: { mediaId, imageUrl, imageFile } }) => {
        const container = await getContainer();
        const mediaService = container.registries.mediaService.get(MediaType.BOOKS);
        await mediaService.updateDefaultCover(mediaId, { imageUrl, imageFile });
    });


export const getMediaDetailsToEdit = createServerFn({ method: "GET" })
    .middleware([requiredAuthAndManagerRoleMiddleware, transactionMiddleware])
    .validator(mediaDetailsToEditSchema)
    .handler(async ({ data: { mediaType, mediaId } }) => {
        const container = await getContainer();
        const mediaService = container.registries.mediaService.get(mediaType);
        return mediaService.getMediaEditableFields(mediaId);
    });


export const postEditMediaDetails = createServerFn({ method: "POST" })
    .middleware([requiredAuthAndManagerRoleMiddleware, transactionMiddleware])
    .validator(editMediaDetailsSchema)
    .handler(async ({ data: { mediaType, mediaId, payload } }) => {
        const container = await getContainer();
        const mediaService = container.registries.mediaService.get(mediaType);
        return mediaService.updateMediaEditableFields(mediaId, payload);
    });
