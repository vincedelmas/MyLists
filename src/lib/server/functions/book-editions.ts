import {createServerFn} from "@tanstack/react-start";
import {MediaType} from "@/lib/utils/enums";
import {getContainer} from "@/lib/server/core/container";
import {logger} from "@/lib/server/core/logger";
import {getPlatformStatsCacheKey, getUserStatsCacheKey} from "@/lib/server/core/cache-keys";
import {publicAuthMiddleware, requiredAuthAndAdminRoleMiddleware, requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {withTransaction} from "@/lib/server/database/async-storage";
import {createBookIsbnService} from "@/lib/server/domain/media/books/book-isbn.service";
import {getBookAuthorReviewQueue, getBookReviewQueue, scanBookWorkCandidates} from "@/lib/server/domain/media/books/book-review.service";
import {bookGroupSeparateSchema, bookIsbnLookupSchema, bookIsbnSelectSchema, bookReviewQueueSchema} from "@/lib/schemas/book-editions.schema";
import {bookCatalogueSchema, bookEditionRefreshSchema, bookGroupMergeSchema, bookGroupPreviewSchema, bookMergePreviewSchema, bookMergeSchema, bookSplitSchema, bookWorkPairSchema, bookWorkSchema} from "@/lib/schemas/book-editions.schema";
import {getBookWork, keepBookWorksSeparate, mergeBookWorkGroup, mergeBookWorks, previewBookMerge, previewBookWorkGroup, searchBookWorks, splitBookEdition} from "@/lib/server/domain/media/books/book-works.service";


export const getBookEditions = createServerFn({ method: "GET" }).middleware([publicAuthMiddleware])
    .validator(bookWorkSchema).handler(async ({ data }) => {
        const container = await getContainer();
        return container.registries.mediaService.get(MediaType.BOOKS).getEditions(data.mediaId);
    });

export const searchBookEditionByIsbn = createServerFn({method: "GET"}).middleware([requiredAuthMiddleware])
    .validator(bookIsbnLookupSchema).handler(async ({data}) => {
        const container = await getContainer();
        return createBookIsbnService(container.apiClients.gBook, container.registries.externalProviders.get(MediaType.BOOKS), container.cacheManager).search(data.mediaId, data.isbn);
    });

export const postSelectBookIsbnEdition = createServerFn({method: "POST"}).middleware([requiredAuthMiddleware])
    .validator(bookIsbnSelectSchema).handler(async ({data}) => {
        const container = await getContainer();
        return createBookIsbnService(container.apiClients.gBook, container.registries.externalProviders.get(MediaType.BOOKS), container.cacheManager).select(data.mediaId, data.isbn, data.apiId);
    });

export const getBookMergeSuggestions = createServerFn({method: "GET"}).middleware([requiredAuthAndAdminRoleMiddleware])
    .validator(bookReviewQueueSchema).handler(({data}) => data.confidence === "author" ? getBookAuthorReviewQueue(data.page) : getBookReviewQueue(data.page, data.confidence));

export const postScanBookWorks = createServerFn({method: "POST"}).middleware([requiredAuthAndAdminRoleMiddleware])
    .handler(() => scanBookWorkCandidates());

export const postKeepBookGroupSeparate = createServerFn({method: "POST"}).middleware([requiredAuthAndAdminRoleMiddleware])
    .validator(bookGroupSeparateSchema).handler(({data, context: {currentUser}}) => withTransaction(() => {
        for (let i = 0; i < data.workIds.length; i++) for (let j = i + 1; j < data.workIds.length; j++) keepBookWorksSeparate(currentUser.id, data.workIds[i], data.workIds[j]);
    }));

export const getBookCatalogue = createServerFn({ method: "GET" }).middleware([requiredAuthAndAdminRoleMiddleware])
    .validator(bookCatalogueSchema).handler(({ data }) => searchBookWorks(data.query, data.page, data.sort));

export const getBookWorkManagement = createServerFn({ method: "GET" }).middleware([requiredAuthAndAdminRoleMiddleware])
    .validator(bookWorkSchema).handler(({ data }) => getBookWork(data.mediaId));

export const getBookMergePreview = createServerFn({ method: "GET" }).middleware([requiredAuthAndAdminRoleMiddleware])
    .validator(bookMergePreviewSchema).handler(({ data }) => previewBookMerge(data.sourceId, data.targetId, data.editionId));

export const getBookGroupPreview = createServerFn({ method: "GET" }).middleware([requiredAuthAndAdminRoleMiddleware])
    .validator(bookGroupPreviewSchema).handler(({ data }) => previewBookWorkGroup(data.workIds));

const invalidateBookStats = async (userIds: number[]) => {
    const { cacheManager } = await getContainer();
    const results = await Promise.allSettled([
        ...[MediaType.BOOKS, "overview" as const].map(tab => cacheManager.del(getPlatformStatsCacheKey(tab))),
        ...userIds.flatMap(userId => [MediaType.BOOKS, "overview" as const].map(tab => cacheManager.del(getUserStatsCacheKey(userId, tab)))),
    ]);
    for (const result of results) if (result.status === "rejected") logger.warn({ err: result.reason }, "Could not invalidate book statistics after grouping");
};

export const postRefreshBookEdition = createServerFn({ method: "POST" }).middleware([requiredAuthAndAdminRoleMiddleware])
    .validator(bookEditionRefreshSchema).handler(async ({ data }) => {
        const container = await getContainer();
        const service = container.registries.mediaService.get(MediaType.BOOKS);
        service.getEditionSnapshot(data.mediaId, data.editionId);
        const edition = service.getEditions(data.mediaId).find(row => row.id === data.editionId)!;
        await container.registries.ingestionServices.get(MediaType.BOOKS).refreshFromExternal(edition.apiId);
    });

export const postMergeBookWorks = createServerFn({ method: "POST" }).middleware([requiredAuthAndAdminRoleMiddleware])
    .validator(bookMergeSchema).handler(async ({ data, context: { currentUser } }) => {
        const result = mergeBookWorks(currentUser.id, data);
        await invalidateBookStats(result.affectedUsers);
        return { mediaId: result.mediaId };
    });

export const postMergeBookWorkGroup = createServerFn({ method: "POST" }).middleware([requiredAuthAndAdminRoleMiddleware])
    .validator(bookGroupMergeSchema).handler(async ({ data, context: { currentUser } }) => {
        const result = mergeBookWorkGroup(currentUser.id, data);
        await invalidateBookStats(result.affectedUsers);
        return {mediaId: result.mediaId};
    });

export const postSplitBookEdition = createServerFn({ method: "POST" }).middleware([requiredAuthAndAdminRoleMiddleware])
    .validator(bookSplitSchema).handler(async ({ data, context: { currentUser } }) => {
        const result = splitBookEdition(currentUser.id, data.editionId, data.name);
        await invalidateBookStats(result.affectedUsers);
        return { mediaId: result.mediaId };
    });

export const postKeepBookWorksSeparate = createServerFn({ method: "POST" }).middleware([requiredAuthAndAdminRoleMiddleware])
    .validator(bookWorkPairSchema).handler(({ data, context: { currentUser } }) => {
        keepBookWorksSeparate(currentUser.id, data.sourceId, data.targetId);
    });
