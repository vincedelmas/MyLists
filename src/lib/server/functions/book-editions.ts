import {createServerFn} from "@tanstack/react-start";
import {MediaType} from "@/lib/utils/enums";
import {getContainer} from "@/lib/server/core/container";
import {logger} from "@/lib/server/core/logger";
import {getPlatformStatsCacheKey, getUserStatsCacheKey} from "@/lib/server/core/cache-keys";
import {publicAuthMiddleware, requiredAuthAndManagerRoleMiddleware} from "@/lib/server/middlewares/authentication";
import {bookCatalogueSchema, bookEditionRefreshSchema, bookMergePreviewSchema, bookMergeSchema, bookSplitSchema, bookWorkPairSchema, bookWorkSchema} from "@/lib/schemas/book-editions.schema";
import {getBookWork, keepBookWorksSeparate, mergeBookWorks, previewBookMerge, searchBookWorks, splitBookEdition} from "@/lib/server/domain/media/books/book-works.service";


export const getBookEditions = createServerFn({ method: "GET" }).middleware([publicAuthMiddleware])
    .validator(bookWorkSchema).handler(async ({ data }) => {
        const container = await getContainer();
        return container.registries.mediaService.get(MediaType.BOOKS).getEditions(data.mediaId);
    });

export const getBookCatalogue = createServerFn({ method: "GET" }).middleware([requiredAuthAndManagerRoleMiddleware])
    .validator(bookCatalogueSchema).handler(({ data }) => searchBookWorks(data.query, data.page));

export const getBookWorkManagement = createServerFn({ method: "GET" }).middleware([requiredAuthAndManagerRoleMiddleware])
    .validator(bookWorkSchema).handler(({ data }) => getBookWork(data.mediaId));

export const getBookMergePreview = createServerFn({ method: "GET" }).middleware([requiredAuthAndManagerRoleMiddleware])
    .validator(bookMergePreviewSchema).handler(({ data }) => previewBookMerge(data.sourceId, data.targetId, data.editionId));

const invalidateBookStats = async (userIds: number[]) => {
    const { cacheManager } = await getContainer();
    const results = await Promise.allSettled([
        ...[MediaType.BOOKS, "overview" as const].map(tab => cacheManager.del(getPlatformStatsCacheKey(tab))),
        ...userIds.flatMap(userId => [MediaType.BOOKS, "overview" as const].map(tab => cacheManager.del(getUserStatsCacheKey(userId, tab)))),
    ]);
    for (const result of results) if (result.status === "rejected") logger.warn({ err: result.reason }, "Could not invalidate book statistics after grouping");
};

export const postRefreshBookEdition = createServerFn({ method: "POST" }).middleware([requiredAuthAndManagerRoleMiddleware])
    .validator(bookEditionRefreshSchema).handler(async ({ data }) => {
        const container = await getContainer();
        const service = container.registries.mediaService.get(MediaType.BOOKS);
        service.getEditionSnapshot(data.mediaId, data.editionId);
        const edition = service.getEditions(data.mediaId).find(row => row.id === data.editionId)!;
        await container.registries.ingestionServices.get(MediaType.BOOKS).refreshFromExternal(edition.apiId);
    });

export const postMergeBookWorks = createServerFn({ method: "POST" }).middleware([requiredAuthAndManagerRoleMiddleware])
    .validator(bookMergeSchema).handler(async ({ data, context: { currentUser } }) => {
        const result = mergeBookWorks(currentUser.id, data);
        await invalidateBookStats(result.affectedUsers);
        return { mediaId: result.mediaId };
    });

export const postSplitBookEdition = createServerFn({ method: "POST" }).middleware([requiredAuthAndManagerRoleMiddleware])
    .validator(bookSplitSchema).handler(async ({ data, context: { currentUser } }) => {
        const result = splitBookEdition(currentUser.id, data.editionId, data.name);
        await invalidateBookStats(result.affectedUsers);
        return { mediaId: result.mediaId };
    });

export const postKeepBookWorksSeparate = createServerFn({ method: "POST" }).middleware([requiredAuthAndManagerRoleMiddleware])
    .validator(bookWorkPairSchema).handler(({ data, context: { currentUser } }) => {
        keepBookWorksSeparate(currentUser.id, data.sourceId, data.targetId);
    });
