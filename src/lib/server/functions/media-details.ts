import {logger} from "@/lib/server/core/logger";
import {notFound} from "@tanstack/react-router";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {FormattedError} from "@/lib/utils/error-classes";
import {dateFromUTCInput} from "@/lib/utils/date-formatting";
import {validateMediaDetailsPage} from "@/lib/contracts/media/details";
import {validateCommunityActivityPage} from "@/lib/contracts/media/community";
import {validateCatalogEditFields} from "@/lib/contracts/media/catalog-edit";
import {validateCompatibleGamePlatforms, validateJobDetailsPage} from "@/lib/contracts/media/projections";
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
            const result = await container.media.details.queries[mediaType].getMediaAndUserDetails(currentUser?.id, mediaId);
            if (!result) throw notFound();
            return validateMediaDetailsPage(result);
        }
        if (mediaType === MediaType.MOVIES) {
            const result = await container.media.details.queries[MediaType.MOVIES].getMediaAndUserDetails(currentUser?.id, mediaId);
            if (!result) throw notFound();
            return validateMediaDetailsPage(result);
        }
        if (mediaType === MediaType.GAMES) {
            const result = await container.media.details.queries[MediaType.GAMES].getMediaAndUserDetails(currentUser?.id, mediaId);
            if (!result) throw notFound();
            return validateMediaDetailsPage(result);
        }
        if (mediaType === MediaType.BOOKS) {
            const result = await container.media.details.queries[MediaType.BOOKS].getMediaAndUserDetails(currentUser?.id, mediaId);
            if (!result) throw notFound();
            return validateMediaDetailsPage(result);
        }
        if (mediaType === MediaType.MANGA) {
            const result = await container.media.details.queries[MediaType.MANGA].getMediaAndUserDetails(currentUser?.id, mediaId);
            if (!result) throw notFound();
            return validateMediaDetailsPage(result);
        }
        throw new Error(`Unsupported media type: ${mediaType}`);
    });


export const getMediaCommunityActivity = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware, transactionMiddleware])
    .validator(mediaCommunityActivitySchema)
    .handler(async ({ data: { mediaType, mediaId, search }, context: { currentUser } }) => {
        const container = await getContainer();
        if (mediaType === MediaType.SERIES || mediaType === MediaType.ANIME) {
            return validateCommunityActivityPage(await container.library.readers[mediaType]
                .getCommunityActivity(currentUser?.id, mediaId, search));
        }
        if (mediaType === MediaType.MOVIES) {
            return validateCommunityActivityPage(await container.library.readers[MediaType.MOVIES]
                .getCommunityActivity(currentUser?.id, mediaId, search));
        }
        if (mediaType === MediaType.GAMES) {
            return validateCommunityActivityPage(await container.library.readers[MediaType.GAMES]
                .getCommunityActivity(currentUser?.id, mediaId, search));
        }
        if (mediaType === MediaType.BOOKS) {
            return validateCommunityActivityPage(await container.library.readers[MediaType.BOOKS]
                .getCommunityActivity(currentUser?.id, mediaId, search));
        }
        if (mediaType === MediaType.MANGA) {
            return validateCommunityActivityPage(await container.library.readers[MediaType.MANGA]
                .getCommunityActivity(currentUser?.id, mediaId, search));
        }
        throw new Error(`Unsupported media type: ${mediaType}`);
    });


export const resolveExternalMedia = createServerFn({ method: "POST" })
    .middleware([publicAuthMiddleware, transactionMiddleware])
    .validator(externalMediaResolveSchema)
    .handler(async ({ data: { mediaType, apiId } }) => {
        const container = await getContainer();
        const ingestionService = container.catalog.ingestion.get(mediaType);
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
        if (mediaType === MediaType.SERIES || mediaType === MediaType.ANIME) {
            const result = await container.media.catalog.readers[mediaType]
                .getMediaJobDetails(job, name, offset, perPage, currentUser?.id);
            return validateJobDetailsPage(result);
        }
        if (mediaType === MediaType.MOVIES) {
            const result = await container.media.catalog.readers[MediaType.MOVIES]
                .getMediaJobDetails(job, name, offset, perPage, currentUser?.id);
            return validateJobDetailsPage(result);
        }
        if (mediaType === MediaType.GAMES) {
            const result = await container.media.catalog.readers[MediaType.GAMES]
                .getMediaJobDetails(job, name, offset, perPage, currentUser?.id);
            return validateJobDetailsPage(result);
        }
        if (mediaType === MediaType.BOOKS) {
            const result = await container.media.catalog.readers[MediaType.BOOKS]
                .getMediaJobDetails(job, name, offset, perPage, currentUser?.id);
            return validateJobDetailsPage(result);
        }
        if (mediaType === MediaType.MANGA) {
            const result = await container.media.catalog.readers[MediaType.MANGA]
                .getMediaJobDetails(job, name, offset, perPage, currentUser?.id);
            return validateJobDetailsPage(result);
        }
        throw new Error(`Unsupported media type: ${mediaType}`);
    });


export const refreshMediaDetails = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(refreshMediaDetailsSchema)
    .handler(async ({ data: { mediaType, mediaId }, context: { currentUser } }) => {
        const container = await getContainer();
        const adminService = container.admin;
        const isManagerOrAbove = isAtLeastRole(currentUser.role as RoleType, RoleType.MANAGER);
        const ingestionService = container.catalog.ingestion.get(mediaType);

        if (!isManagerOrAbove && mediaType === MediaType.BOOKS) {
            throw new FormattedError("Unauthorized to refresh book metadata.");
        }

        const media = container.media.catalog.refreshCandidates.getItemIdentity(mediaType, mediaId);
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

        return validateCompatibleGamePlatforms(
            await container.media.catalog.readers[MediaType.GAMES].getCompatiblePlatforms(mediaId),
        );
    });


export const postUpdateBookCover = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator((data) => updateBookCoverSchema.parse(data instanceof FormData ? Object.fromEntries(data.entries()) : data))
    .handler(async ({ data: { mediaId, imageUrl, imageFile } }) => {
        const container = await getContainer();
        await container.media.catalog.bookCover.contribute(mediaId, { imageUrl, imageFile });
    });


export const getMediaDetailsToEdit = createServerFn({ method: "GET" })
    .middleware([requiredAuthAndManagerRoleMiddleware, transactionMiddleware])
    .validator(mediaDetailsToEditSchema)
    .handler(async ({ data: { mediaType, mediaId } }) => {
        const container = await getContainer();

        if (mediaType === MediaType.SERIES) {
            const result = await container.media.catalog.adminReaders[MediaType.SERIES].getEditableFields(mediaId);
            if (!result) throw notFound();
            return validateCatalogEditFields(result);
        }
        if (mediaType === MediaType.ANIME) {
            const result = await container.media.catalog.adminReaders[MediaType.ANIME].getEditableFields(mediaId);
            if (!result) throw notFound();
            return validateCatalogEditFields(result);
        }
        if (mediaType === MediaType.MOVIES) {
            const result = await container.media.catalog.adminReaders[MediaType.MOVIES].getEditableFields(mediaId);
            if (!result) throw notFound();
            return validateCatalogEditFields(result);
        }
        if (mediaType === MediaType.GAMES) {
            const result = await container.media.catalog.adminReaders[MediaType.GAMES].getEditableFields(mediaId);
            if (!result) throw notFound();
            return validateCatalogEditFields(result);
        }
        if (mediaType === MediaType.BOOKS) {
            const result = await container.media.catalog.adminReaders[MediaType.BOOKS].getEditableFields(mediaId);
            if (!result) throw notFound();
            return validateCatalogEditFields(result);
        }

        const result = await container.media.catalog.adminReaders[MediaType.MANGA].getEditableFields(mediaId);
        if (!result) throw notFound();
        return validateCatalogEditFields(result);
    });


export const postEditMediaDetails = createServerFn({ method: "POST" })
    .middleware([requiredAuthAndManagerRoleMiddleware, transactionMiddleware])
    .validator(editMediaDetailsSchema)
    .handler(async ({ data }) => {
        const container = await getContainer();
        await container.media.catalog.edit.update(data);
    });
