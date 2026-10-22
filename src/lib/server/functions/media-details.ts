import {MediaType} from "@/lib/utils/enums";
import {toActor} from "@/lib/server/authorization";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {FormattedError} from "@/lib/utils/error-classes";
import {refreshCatalogMedia} from "@/lib/server/domain/media/media-refresh";
import {publicAuthMiddleware, requiredAuthAndManagerRoleMiddleware, requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {requiredMediaReadMiddleware, requiredMediaWriteMiddleware, optionalMediaAuthMiddleware} from "@/lib/server/middlewares/media-authentication";
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
    .middleware([optionalMediaAuthMiddleware])
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
    .middleware([publicAuthMiddleware])
    .validator(mediaCommunityActivitySchema)
    .handler(async ({ data: { mediaType, mediaId, search }, context: { currentUser } }) => {
        const container = await getContainer();
        const mediaService = container.registries.mediaService.get(mediaType);
        return mediaService.getMediaCommunityActivity(toActor(currentUser), mediaId, search);
    });


export const resolveExternalMedia = createServerFn({ method: "POST" })
    .middleware([requiredMediaWriteMiddleware])
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
    .handler(async ({ data: { mediaType, job, name, filters }, context: { currentUser } }) => {
        const container = await getContainer();
        const mediaService = container.registries.mediaService.get(mediaType);
        return mediaService.getMediaJobDetails(job, name, filters, currentUser?.id);
    });


export const refreshMediaDetails = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(refreshMediaDetailsSchema)
    .handler(async ({ data: { mediaType, mediaId }, context: { currentUser } }) => {
        await refreshCatalogMedia(toActor(currentUser), mediaType, mediaId);
    });


export const checkGameHltb = createServerFn({ method: "POST" })
    .middleware([publicAuthMiddleware])
    .validator(mediaTypeMediaIdSchema)
    .handler(async ({ data: { mediaType, mediaId } }) => {
        if (mediaType !== MediaType.GAMES) {
            throw new FormattedError("HLTB lookup is only available for games.");
        }

        const container = await getContainer();
        return container.registries.ingestionServices.get(MediaType.GAMES).checkMissingHltb(mediaId);
    });


export const getGameCompatiblePlatforms = createServerFn({ method: "GET" })
    .middleware([requiredMediaReadMiddleware])
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
    .middleware([requiredAuthMiddleware])
    .validator((data) => updateBookCoverSchema.parse(data instanceof FormData ? Object.fromEntries(data.entries()) : data))
    .handler(async ({ data: { mediaId, imageUrl, imageFile } }) => {
        const container = await getContainer();
        const mediaService = container.registries.mediaService.get(MediaType.BOOKS);
        await mediaService.updateDefaultCover(mediaId, { imageUrl, imageFile });
    });


export const getMediaDetailsToEdit = createServerFn({ method: "GET" })
    .middleware([requiredAuthAndManagerRoleMiddleware])
    .validator(mediaDetailsToEditSchema)
    .handler(async ({ data: { mediaType, mediaId } }) => {
        const container = await getContainer();
        const mediaService = container.registries.mediaService.get(mediaType);
        return mediaService.getMediaEditableFields(mediaId);
    });


export const postEditMediaDetails = createServerFn({ method: "POST" })
    .middleware([requiredAuthAndManagerRoleMiddleware])
    .validator(editMediaDetailsSchema)
    .handler(async ({ data: { mediaType, mediaId, payload } }) => {
        const container = await getContainer();
        const mediaService = container.registries.mediaService.get(mediaType);
        return mediaService.updateMediaEditableFields(mediaId, payload);
    });
