import {logger} from "@/lib/server/core/logger";
import {notFound} from "@tanstack/react-router";
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
        if (mediaType === MediaType.SERIES || mediaType === MediaType.ANIME) {
            const result = await container.features.tvDetailsReaders[mediaType].getMediaAndUserDetails(currentUser?.id, mediaId);
            if (!result) throw notFound();
            return {
                similarMedia: result.similarMedia,
                media: { ...result.media, kind: mediaType },
                userMedia: result.userMedia ? { ...result.userMedia, kind: mediaType } : null,
                followsData: result.followsData.map((follow) => ({
                    ...follow,
                    userMedia: { ...follow.userMedia, kind: mediaType },
                })),
            };
        }
        if (mediaType === MediaType.MOVIES) {
            const result = await container.features.movieDetailsReader.getMediaAndUserDetails(currentUser?.id, mediaId);
            if (!result) throw notFound();
            return {
                similarMedia: result.similarMedia,
                media: { ...result.media, kind: mediaType },
                userMedia: result.userMedia ? { ...result.userMedia, kind: mediaType } : null,
                followsData: result.followsData.map((follow) => ({
                    ...follow,
                    userMedia: { ...follow.userMedia, kind: mediaType },
                })),
            };
        }
        if (mediaType === MediaType.GAMES) {
            const result = await container.features.gameDetailsReader.getMediaAndUserDetails(currentUser?.id, mediaId);
            if (!result) throw notFound();
            return {
                similarMedia: result.similarMedia,
                media: { ...result.media, kind: mediaType },
                userMedia: result.userMedia ? { ...result.userMedia, kind: mediaType } : null,
                followsData: result.followsData.map((follow) => ({
                    ...follow,
                    userMedia: { ...follow.userMedia, kind: mediaType },
                })),
            };
        }
        if (mediaType === MediaType.BOOKS) {
            const result = await container.features.bookDetailsReader.getMediaAndUserDetails(currentUser?.id, mediaId);
            if (!result) throw notFound();
            return {
                similarMedia: result.similarMedia,
                media: { ...result.media, kind: mediaType },
                userMedia: result.userMedia ? { ...result.userMedia, kind: mediaType } : null,
                followsData: result.followsData.map((follow) => ({
                    ...follow,
                    userMedia: { ...follow.userMedia, kind: mediaType },
                })),
            };
        }
        if (mediaType === MediaType.MANGA) {
            const result = await container.features.mangaDetailsReader.getMediaAndUserDetails(currentUser?.id, mediaId);
            if (!result) throw notFound();
            return {
                similarMedia: result.similarMedia,
                media: { ...result.media, kind: mediaType },
                userMedia: result.userMedia ? { ...result.userMedia, kind: mediaType } : null,
                followsData: result.followsData.map((follow) => ({
                    ...follow,
                    userMedia: { ...follow.userMedia, kind: mediaType },
                })),
            };
        }
        throw new Error(`Unsupported media type: ${mediaType}`);
    });


export const getMediaCommunityActivity = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware, transactionMiddleware])
    .validator(mediaCommunityActivitySchema)
    .handler(async ({ data: { mediaType, mediaId, search }, context: { currentUser } }) => {
        const container = await getContainer();
        if (mediaType === MediaType.SERIES || mediaType === MediaType.ANIME) {
            return container.features.tvDetailsReaders[mediaType]
                .getCommunityActivity(currentUser?.id, mediaId, search);
        }
        if (mediaType === MediaType.MOVIES) {
            return container.features.movieDetailsReader
                .getCommunityActivity(currentUser?.id, mediaId, search);
        }
        if (mediaType === MediaType.GAMES) {
            return container.features.gameDetailsReader
                .getCommunityActivity(currentUser?.id, mediaId, search);
        }
        if (mediaType === MediaType.BOOKS) {
            return container.features.bookDetailsReader
                .getCommunityActivity(currentUser?.id, mediaId, search);
        }
        if (mediaType === MediaType.MANGA) {
            return container.features.mangaDetailsReader
                .getCommunityActivity(currentUser?.id, mediaId, search);
        }
        throw new Error(`Unsupported media type: ${mediaType}`);
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
        if (mediaType === MediaType.SERIES || mediaType === MediaType.ANIME) {
            return container.features.tvDetailsReaders[mediaType]
                .getMediaJobDetails(job, name, pagination, currentUser?.id);
        }
        if (mediaType === MediaType.MOVIES) {
            return container.features.movieDetailsReader
                .getMediaJobDetails(job, name, pagination, currentUser?.id);
        }
        if (mediaType === MediaType.GAMES) {
            return container.features.gameDetailsReader
                .getMediaJobDetails(job, name, pagination, currentUser?.id);
        }
        if (mediaType === MediaType.BOOKS) {
            return container.features.bookDetailsReader
                .getMediaJobDetails(job, name, pagination, currentUser?.id);
        }
        if (mediaType === MediaType.MANGA) {
            return container.features.mangaDetailsReader
                .getMediaJobDetails(job, name, pagination, currentUser?.id);
        }
        throw new Error(`Unsupported media type: ${mediaType}`);
    });


export const refreshMediaDetails = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(refreshMediaDetailsSchema)
    .handler(async ({ data: { mediaType, mediaId }, context: { currentUser } }) => {
        const container = await getContainer();
        const adminService = container.services.admin;
        const isManagerOrAbove = isAtLeastRole(currentUser.role as RoleType, RoleType.MANAGER);
        const ingestionService = container.registries.ingestionServices.get(mediaType);

        if (!isManagerOrAbove && mediaType === MediaType.BOOKS) {
            throw new FormattedError("Unauthorized to refresh book metadata.");
        }

        const media = container.features.catalogRefreshCandidates.getItemIdentity(mediaType, mediaId);
        if (!media) throw new FormattedError("Media not found, cannot refresh metadata.");

        if (!isManagerOrAbove && media.lastApiUpdate) {
            const lastUpdateTime = dateFromUTCInput(media.lastApiUpdate).getTime();
            const nextAvailableRefresh = lastUpdateTime + (24 * 60 * 60 * 1000); // 24 hours cooldown

            if (Date.now() < nextAvailableRefresh) {
                throw new FormattedError("You can refresh metadata once every 24 hours.");
            }
        }

        await ingestionService.refreshFromExternal(media.apiId);
        void adminService.logMediaRefresh({ userId: currentUser.id, mediaType, apiId: media.apiId })
            .catch((err) => {
                logger.warn({ err, userId: currentUser.id, mediaType, apiId: media.apiId }, "Failed to log media refresh");
            });
    });


export const getGameCompatiblePlatforms = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(mediaTypeMediaIdSchema)
    .handler(async ({ data: { mediaType, mediaId } }) => {
        const container = await getContainer();
        if (mediaType !== MediaType.GAMES) {
            throw new FormattedError("Platform lookup is only available for games ;).");
        }

        return container.features.gameDetailsReader.getCompatiblePlatforms(mediaId);
    });


export const postUpdateBookCover = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator((data) => updateBookCoverSchema.parse(data instanceof FormData ? Object.fromEntries(data.entries()) : data))
    .handler(async ({ data: { mediaId, imageUrl, imageFile } }) => {
        const container = await getContainer();
        await container.features.bookCoverContribution.contribute(mediaId, { imageUrl, imageFile });
    });


export const getMediaDetailsToEdit = createServerFn({ method: "GET" })
    .middleware([requiredAuthAndManagerRoleMiddleware, transactionMiddleware])
    .validator(mediaDetailsToEditSchema)
    .handler(async ({ data: { mediaType, mediaId } }) => {
        const container = await getContainer();

        const result = await container.features.catalogAdminReaders[mediaType].getEditableFields(mediaId);
        if (!result) throw notFound();

        return result;
    });


export const postEditMediaDetails = createServerFn({ method: "POST" })
    .middleware([requiredAuthAndManagerRoleMiddleware, transactionMiddleware])
    .validator(editMediaDetailsSchema)
    .handler(async ({ data: { mediaType, mediaId, payload } }) => {
        const container = await getContainer();
        await container.features.catalogManagerEditor.update(mediaType, mediaId, payload);
    });
