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
    mediaDetailsToEditSchema,
    mediaTypeMediaIdSchema,
    refreshMediaDetailsSchema,
    updateBookCoverSchema
} from "@/lib/schemas";


export const getMediaDetails = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware, transactionMiddleware])
    .validator(mediaTypeMediaIdSchema)
    .handler(async ({ data: { mediaType, mediaId }, context: { currentUser } }) => {
        const container = await getContainer();

        const result = await container.media.get(mediaType).catalog.details.getMediaAndUserDetails(currentUser?.id, mediaId);
        if (!result) throw notFound();

        return result;
    });


export const getMediaCommunityActivity = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware, transactionMiddleware])
    .validator(mediaCommunityActivitySchema)
    .handler(async ({ data: { mediaType, mediaId, search }, context: { currentUser } }) => {
        const container = await getContainer();
        return container.media.get(mediaType).library.read.getCommunityActivity(currentUser?.id, mediaId, search);
    });


export const resolveExternalMedia = createServerFn({ method: "POST" })
    .middleware([publicAuthMiddleware, transactionMiddleware])
    .validator(externalMediaResolveSchema)
    .handler(async ({ data: { mediaType, apiId } }) => {
        const container = await getContainer();

        const ingestionService = container.media.get(mediaType).catalog.ingestion;
        const mediaId = await ingestionService.storeFromExternal(apiId);

        return { mediaId };
    });


export const getJobDetails = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .validator(jobDetailsSchema)
    .handler(async ({ data: { mediaType, job, name, pagination }, context: { currentUser } }) => {
        const container = await getContainer();

        const page = pagination.page ?? 1;
        const perPage = pagination.perPage ?? 24;
        const offset = (page - 1) * perPage;

        return container.media.get(mediaType).catalog.read.getMediaJobDetails(job, name, offset, perPage, currentUser?.id);
    });


export const refreshMediaDetails = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(refreshMediaDetailsSchema)
    .handler(async ({ data: { mediaType, mediaId }, context: { currentUser } }) => {
        const container = await getContainer();
        const adminService = container.admin;
        const isManagerOrAbove = isAtLeastRole(currentUser.role as RoleType, RoleType.MANAGER);
        const mediaModule = container.media.get(mediaType);

        if (!isManagerOrAbove && mediaType === MediaType.BOOKS) {
            throw new FormattedError("Unauthorized to refresh book metadata.");
        }

        const media = mediaModule.catalog.refreshIdentity.get(mediaId);
        if (!media) throw new FormattedError("Media not found, cannot refresh metadata.");

        if (!isManagerOrAbove && media.lastApiUpdate) {
            const lastUpdateTime = dateFromUTCInput(media.lastApiUpdate).getTime();
            const nextAvailableRefresh = lastUpdateTime + (24 * 60 * 60 * 1000); // 24 hours cooldown

            if (Date.now() < nextAvailableRefresh) {
                throw new FormattedError("You can refresh metadata once every 24 hours.");
            }
        }

        await mediaModule.catalog.ingestion.refreshFromExternal(media.apiId);
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

        return container.media.get(MediaType.GAMES).catalog.read.getCompatiblePlatforms(mediaId);
    });


export const postUpdateBookCover = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator((data) => updateBookCoverSchema.parse(data instanceof FormData ? Object.fromEntries(data.entries()) : data))
    .handler(async ({ data: { mediaId, imageUrl, imageFile } }) => {
        const container = await getContainer();
        await container.media.get(MediaType.BOOKS).catalog.contributeCover.contribute(mediaId, { imageUrl, imageFile });
    });


export const getMediaDetailsToEdit = createServerFn({ method: "GET" })
    .middleware([requiredAuthAndManagerRoleMiddleware, transactionMiddleware])
    .validator(mediaDetailsToEditSchema)
    .handler(async ({ data: { mediaType, mediaId } }) => {
        const container = await getContainer();

        const result = await container.media.get(mediaType).catalog.admin.getEditableFields(mediaId);
        if (!result) throw notFound();

        return result;
    });


export const postEditMediaDetails = createServerFn({ method: "POST" })
    .middleware([requiredAuthAndManagerRoleMiddleware, transactionMiddleware])
    .validator(editMediaDetailsSchema)
    .handler(async ({ data }) => {
        const container = await getContainer();
        await container.mediaShared.catalogEdit.update(data);
    });
