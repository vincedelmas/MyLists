import {SearchType} from "@/lib/schemas";
import {SaveTaskToDb} from "@/lib/types/tasks.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import {MediaType, PrivacyType, Status} from "@/lib/utils/enums";
import {YearRecapReleaseMode} from "@/lib/types/year-recap.types";
import {getImageFilename} from "@/lib/server/core/images/image-url";
import {paginate, resolveSorting} from "@/lib/server/database/pagination";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {dateFromUTCInput, formatMonthYear} from "@/lib/utils/formatting/date";
import type {HighlightedMediaSettings} from "@/lib/types/profile-custom.types";
import {mediaRelationArray} from "@/lib/server/domain/media/base/media-relations.queries";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";
import {CollectionsRepository} from "@/lib/server/domain/collections/collections.repository";
import type {AdminBookMergeSearch, AdminMissingCoversSearch} from "@/lib/schemas/admin.schema";
import {getCollectionMediaTypesSelection} from "@/lib/server/domain/collections/collections.queries";
import {AdminBookMergeItem, AdminBookMergePreview, ProviderApiRollup} from "@/lib/types/admin.types";
import {and, asc, count, countDistinct, desc, eq, exists, gte, inArray, like, lt, lte, or, sql} from "drizzle-orm";
import {
    apiCallRollup,
    books,
    booksAuthors,
    booksList,
    booksTags,
    collectionItems,
    collections,
    dynamicLists,
    importItems,
    mediaNotifications,
    mediaRefreshLog,
    profileCustom,
    taskHistory,
    user,
    userMediaMonthlyActivity,
    userMediaStatsHistory,
    userMediaUpdate,
    whichCameFirstMedia,
    yearRecapRelease
} from "@/lib/server/database/schema";


const normalizeBookMatch = (value: string) => value.normalize("NFKD").toLowerCase()
    .replace(/(\p{Script=Latin})\p{M}+/gu, "$1")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim();


export class AdminRepository {
    static async getMissingCovers({ mediaType, search, ...pagination }: AdminMissingCoversSearch) {
        const db = getDbClient();
        const mediaTypes = mediaType ? [mediaType] : ALL_MEDIA_TYPES;

        const queries = mediaTypes.map(mt => {
            const { mediaTable } = getServerMediaDefinition(mt).repository.tables;

            const authors = mt === MediaType.BOOKS
                ? sql<string | null>`(${db
                    .select({ names: sql<string>`group_concat(${booksAuthors.name}, ', ')` })
                    .from(booksAuthors)
                    .where(eq(booksAuthors.mediaId, mediaTable.id))})`
                : sql<string | null>`null`;

            return db
                .select({
                    name: mediaTable.name,
                    mediaId: mediaTable.id,
                    authors: authors.as("authors"),
                    releaseDate: mediaTable.releaseDate,
                    mediaType: sql<MediaType>`${mt}`.as("media_type"),
                }).from(mediaTable)
                .where(and(
                    eq(mediaTable.imageCover, "default.jpg"),
                    search ? like(mediaTable.name, `%${search}%`) : undefined,
                )).$dynamic();
        });

        const [firstQuery, ...otherQueries] = queries;

        for (const query of otherQueries) {
            firstQuery.unionAll(query);
        }

        const missing = firstQuery.as("missing_covers");

        return paginate({
            ...pagination,

            getTotal: () => db
                .select({ total: count() })
                .from(missing)
                .get()!.total,

            getItems: async ({ limit, offset }) => db
                .select()
                .from(missing)
                .orderBy(sql`${missing.name} collate nocase`, asc(missing.mediaType), asc(missing.mediaId))
                .limit(limit)
                .offset(offset)
                .all(),
        });
    }

    static hasMissingCover(mediaType: MediaType, mediaId: number) {
        const { mediaTable } = getServerMediaDefinition(mediaType).repository.tables;

        return !!getDbClient()
            .select({ id: mediaTable.id })
            .from(mediaTable)
            .where(and(eq(mediaTable.id, mediaId), eq(mediaTable.imageCover, "default.jpg")))
            .get();
    }

    static updateMissingCover(mediaType: MediaType, mediaId: number, imageCover: string) {
        const { mediaTable } = getServerMediaDefinition(mediaType).repository.tables;

        return getDbClient()
            .update(mediaTable)
            .set({ imageCover })
            .where(and(eq(mediaTable.id, mediaId), eq(mediaTable.imageCover, "default.jpg")))
            .returning({ id: mediaTable.id })
            .get();
    }

    static async getBooksForAdminMerge({ view, author, search, ...pagination }: AdminBookMergeSearch) {
        const db = getDbClient();
        const trimmed = search?.trim();
        const selectedAuthor = view === "authors" ? author : undefined;

        const titleOrder = sql`${books.name} COLLATE NOCASE`;
        const usersCountExpr = sql<number>`(SELECT COUNT(*) FROM ${booksList} WHERE ${booksList.mediaId} = ${books.id})`;

        const selection = {
            id: books.id,
            name: books.name,
            apiId: books.apiId,
            pages: books.pages,
            language: books.language,
            publishers: books.publishers,
            imageCover: books.imageCover,
            releaseDate: books.releaseDate,
            usersCount: usersCountExpr.as("users_count"),
            authors: sql<string | null>`(
                SELECT group_concat(${booksAuthors.name}, ', ')
                FROM ${booksAuthors}
                WHERE ${booksAuthors.mediaId} = ${books.id}
            )`.as("authors"),
        };

        const catalog = view === "catalog" ? [] : db
            .select({
                id: books.id,
                title: books.name,
                authors: mediaRelationArray(booksAuthors, books.id, { name: booksAuthors.name }, booksAuthors.id),
            }).from(books)
            .orderBy(...(selectedAuthor ? [titleOrder, asc(books.id)] : [asc(books.id)]))
            .all()
            .map(book => ({
                ...book,
                authors: book.authors.map(({ name }) => ({ name, key: normalizeBookMatch(name) }))
                    .filter(item => item.key),
            }));

        const searchKey = trimmed && normalizeBookMatch(trimmed);

        if (view === "authors" && !author) {
            const byAuthor = new Map<string, { name: string; bookIds: Set<number> }>();
            for (const book of catalog) {
                for (const { key, name } of book.authors) {
                    if (trimmed && !(searchKey && key.includes(searchKey))) continue;

                    const group = byAuthor.get(key) ?? { name, bookIds: new Set<number>() };
                    group.bookIds.add(book.id);
                    byAuthor.set(key, group);
                }
            }

            const authors = Array.from(byAuthor, ([key, group]) => ({
                key,
                name: group.name,
                bookCount: group.bookIds.size,
            })).filter(item => item.bookCount > 1).sort((a, b) => b.bookCount - a.bookCount || a.key.localeCompare(b.key));

            return {
                kind: "authors" as const,
                ...await paginate({
                    ...pagination,
                    maxPerPage: 50,
                    defaultPerPage: 20,
                    getTotal: () => authors.length,
                    getItems: async ({ limit, offset }) => authors.slice(offset, offset + limit),
                }),
            };
        }

        if (view === "duplicates") {
            const byTitleAndAuthors = new Map<string, { key: string; title: string; ids: number[] }>();
            for (const book of catalog) {
                const title = normalizeBookMatch(book.title);
                if (!title || book.authors.length === 0) continue;

                const authorKeys = new Set(book.authors.map(item => item.key));
                const matchFields = [title, ...[...authorKeys].sort()];
                if (trimmed && !(searchKey && matchFields.some(field => field.includes(searchKey)))) continue;

                const key = JSON.stringify(matchFields);
                const group = byTitleAndAuthors.get(key) ?? { key, title, ids: [] };

                group.ids.push(book.id);
                byTitleAndAuthors.set(key, group);
            }

            const groups = [...byTitleAndAuthors.values()]
                .filter(group => group.ids.length > 1)
                .sort((a, b) => b.ids.length - a.ids.length || a.title.localeCompare(b.title) || a.key.localeCompare(b.key));

            return {
                kind: "duplicates" as const,
                ...await paginate({
                    ...pagination,
                    maxPerPage: 50,
                    defaultPerPage: 5,
                    getTotal: () => groups.length,
                    getItems: async ({ limit, offset }) => {
                        const page = groups.slice(offset, offset + limit);
                        if (page.length === 0) return [];

                        const rows = db.select(selection).from(books)
                            .where(inArray(books.id, page.flatMap(group => group.ids)))
                            .all();

                        const byId = new Map(rows.map(book => [book.id, book]));

                        return page.flatMap(group => {
                            const matches = group.ids.flatMap(id => byId.get(id) ?? [])
                                .sort((a, b) => b.usersCount - a.usersCount || a.id - b.id);

                            return matches.length > 1 ? [{ key: group.key, books: matches }] : [];
                        });
                    },
                }),
            };
        }

        if (selectedAuthor) {
            const authorBooks = catalog.flatMap(book => {
                const match = book.authors.find(item => item.key === selectedAuthor);
                return match ? [{ id: book.id, author: match.name }] : [];
            });

            return {
                kind: "author-books" as const,
                author: authorBooks[0]?.author ?? selectedAuthor,
                ...await paginate({
                    ...pagination,
                    maxPerPage: 50,
                    defaultPerPage: 20,
                    getTotal: () => authorBooks.length,
                    getItems: async ({ limit, offset }) => {
                        const pageIds = authorBooks.slice(offset, offset + limit).map(book => book.id);
                        if (pageIds.length === 0) return [];

                        return db.select(selection).from(books)
                            .where(inArray(books.id, pageIds))
                            .orderBy(titleOrder, asc(books.id))
                            .all();
                    },
                }),
            };
        }

        const numericId = trimmed && /^#?\d+$/.test(trimmed)
            ? Number(trimmed.replace(/^#/, ""))
            : null;

        const where = trimmed
            ? or(
                like(books.name, `%${trimmed}%`),
                like(books.apiId, `%${trimmed}%`),
                like(books.publishers, `%${trimmed}%`),
                numericId !== null ? eq(books.id, numericId) : undefined,
                exists(
                    db.select({ id: booksAuthors.id })
                        .from(booksAuthors)
                        .where(and(eq(booksAuthors.mediaId, books.id), like(booksAuthors.name, `%${trimmed}%`))),
                ),
            )
            : undefined;

        const results = await paginate<AdminBookMergeItem>({
            ...pagination,
            maxPerPage: 50,
            defaultPerPage: 20,
            getTotal: () => db
                .select({ total: count() })
                .from(books)
                .where(where)
                .get()!.total,
            getItems: async ({ limit, offset }) => db
                .select(selection)
                .from(books)
                .where(where)
                .orderBy(desc(usersCountExpr), titleOrder, asc(books.id))
                .limit(limit)
                .offset(offset)
                .all(),
        });

        return { kind: "catalog" as const, ...results };
    }

    static findBooksByIds(bookIds: number[]) {
        if (bookIds.length === 0) return [];

        return getDbClient()
            .select({ id: books.id, name: books.name })
            .from(books)
            .where(inArray(books.id, bookIds))
            .all();
    }

    static getBookMergePreview(targetBookId: number, sourceBookIds: number[]): AdminBookMergePreview {
        const db = getDbClient();

        const targetUserRows = db
            .select({ userId: booksList.userId })
            .from(booksList)
            .where(eq(booksList.mediaId, targetBookId))
            .all();

        const seenUserIds = new Set(targetUserRows.map(row => row.userId));

        const sourceListRows = db
            .select({ userId: booksList.userId, username: user.name })
            .from(booksList)
            .innerJoin(user, eq(user.id, booksList.userId))
            .where(inArray(booksList.mediaId, sourceBookIds))
            .orderBy(asc(user.name))
            .all();

        let movedListEntries = 0;
        const overlappingById = new Map<number, string>();

        for (const row of sourceListRows) {
            if (seenUserIds.has(row.userId)) {
                overlappingById.set(row.userId, row.username);
            }
            else {
                seenUserIds.add(row.userId);
                movedListEntries += 1;
            }
        }

        const movedCollectionItems = db
            .select({ total: count() })
            .from(collectionItems)
            .where(and(
                eq(collectionItems.mediaType, MediaType.BOOKS),
                inArray(collectionItems.mediaId, sourceBookIds),
            ))
            .get()!.total;

        const targetActivityKeys = new Set(
            db.select({
                userId: userMediaMonthlyActivity.userId,
                monthBucket: userMediaMonthlyActivity.monthBucket,
            })
                .from(userMediaMonthlyActivity)
                .where(and(
                    eq(userMediaMonthlyActivity.mediaType, MediaType.BOOKS),
                    eq(userMediaMonthlyActivity.mediaId, targetBookId),
                ))
                .all()
                .map(row => `${row.userId}:${row.monthBucket}`),
        );

        const sourceActivityRows = db
            .select({
                userId: userMediaMonthlyActivity.userId,
                monthBucket: userMediaMonthlyActivity.monthBucket,
            })
            .from(userMediaMonthlyActivity)
            .where(and(
                eq(userMediaMonthlyActivity.mediaType, MediaType.BOOKS),
                inArray(userMediaMonthlyActivity.mediaId, sourceBookIds),
            ))
            .all();

        let movedActivities = 0;
        let mergedActivities = 0;
        for (const row of sourceActivityRows) {
            const key = `${row.userId}:${row.monthBucket}`;
            if (targetActivityKeys.has(key)) {
                mergedActivities += 1;
            }
            else {
                targetActivityKeys.add(key);
                movedActivities += 1;
            }
        }

        return {
            movedActivities,
            mergedActivities,
            movedListEntries,
            movedCollectionItems,
            overlappingUsers: [...overlappingById.entries()].map(([id, name]) => ({ id, name })),
        };
    }

    static mergeBooks(targetBookId: number, sourceBookIds: number[]) {
        const db = getDbClient();
        const sourceIdSet = new Set(sourceBookIds);
        const allBookIds = [targetBookId, ...sourceBookIds];

        // Re-point 'books_list' rows while keeping each user's edition snapshot intact.
        // If a user has multiple entries across the target and duplicates, keep the richest / most recently updated entry.
        const bookCoverFilenames = new Map(
            db.select({ id: books.id, imageCover: books.imageCover })
                .from(books)
                .where(inArray(books.id, allBookIds))
                .all()
                .map(book => [book.id, getImageFilename(book.imageCover)]),
        );
        const targetCoverFilename = bookCoverFilenames.get(targetBookId) ?? "default.jpg";

        const allListRows = db
            .select({
                id: booksList.id,
                userId: booksList.userId,
                mediaId: booksList.mediaId,
                status: booksList.status,
                total: booksList.total,
                rating: booksList.rating,
                comment: booksList.comment,
                favorite: booksList.favorite,
                actualPage: booksList.actualPage,
                customCover: booksList.customCover,
                addedAt: booksList.addedAt,
                lastUpdated: booksList.lastUpdated,
            })
            .from(booksList)
            .where(inArray(booksList.mediaId, allBookIds))
            .all();

        const rowsByUser = new Map<number, typeof allListRows>();
        for (const row of allListRows) {
            const group = rowsByUser.get(row.userId) ?? [];
            group.push(row);
            rowsByUser.set(row.userId, group);
        }

        const scoreListRow = (row: (typeof allListRows)[number]) => {
            const nonPlanned = row.status !== Status.PLANNED ? 1 : 0;
            const richness = (row.status === Status.COMPLETED ? 2 : 0)
                + (row.rating !== null ? 2 : 0)
                + (row.comment?.trim() ? 2 : 0)
                + (row.favorite ? 1 : 0)
                + (row.total > 0 || (row.actualPage ?? 0) > 0 ? 1 : 0);
            const updatedMs = dateFromUTCInput(row.lastUpdated ?? row.addedAt ?? "").getTime();

            return {
                nonPlanned,
                richness,
                total: row.total,
                updatedMs: Number.isFinite(updatedMs) ? updatedMs : 0,
                isTarget: row.mediaId === targetBookId ? 1 : 0,
                id: row.id,
            };
        };

        let movedListEntries = 0;
        let duplicateListEntriesRemoved = 0;
        const recomputeStatsUserIds = new Set<number>();

        for (const [userId, userRows] of rowsByUser) {
            userRows.sort((a, b) => {
                const sa = scoreListRow(a);
                const sb = scoreListRow(b);
                return (sb.nonPlanned - sa.nonPlanned)
                    || (sb.richness - sa.richness)
                    || (sb.total - sa.total)
                    || (sb.updatedMs - sa.updatedMs)
                    || (sb.isTarget - sa.isTarget)
                    || (sb.id - sa.id);
            });

            const [winner, ...losers] = userRows;

            if (losers.length > 0) {
                db.delete(booksList)
                    .where(inArray(booksList.id, losers.map(row => row.id)))
                    .run();
                duplicateListEntriesRemoved += losers.length;
                recomputeStatsUserIds.add(userId);
            }

            if (winner.mediaId !== targetBookId) {
                const sourceCoverFilename = bookCoverFilenames.get(winner.mediaId) ?? "default.jpg";
                const preservedCustomCover = winner.customCover === null
                && sourceCoverFilename !== "default.jpg"
                && sourceCoverFilename !== targetCoverFilename
                    ? sourceCoverFilename
                    : undefined;

                db.update(booksList)
                    .set({
                        mediaId: targetBookId,
                        ...(preservedCustomCover ? { customCover: preservedCustomCover } : {}),
                    })
                    .where(eq(booksList.id, winner.id))
                    .run();
                if (losers.every(row => row.mediaId !== targetBookId)) {
                    movedListEntries += 1;
                }
            }
        }

        // Merge user tags without violating (user_id, media_id, tag_id) uniqueness
        const sourceTagRows = db
            .select({ userId: booksTags.userId, tagId: booksTags.tagId })
            .from(booksTags)
            .where(inArray(booksTags.mediaId, sourceBookIds))
            .all();

        if (sourceTagRows.length > 0) {
            db.insert(booksTags)
                .values(sourceTagRows.map(row => ({
                    tagId: row.tagId,
                    userId: row.userId,
                    mediaId: targetBookId,
                }))).onConflictDoNothing()
                .run();

            db.delete(booksTags)
                .where(inArray(booksTags.mediaId, sourceBookIds))
                .run();
        }

        // Merge monthly activity buckets:
        // - Same visibility (both visible or both hidden): sum counters and keep latest timestamp.
        // - Mixed visibility (one visible, one hidden): keep only the visible entry's counters so hidden activity never leaks into recaps.
        const sourceActivities = db
            .select()
            .from(userMediaMonthlyActivity)
            .where(and(
                eq(userMediaMonthlyActivity.mediaType, MediaType.BOOKS),
                inArray(userMediaMonthlyActivity.mediaId, sourceBookIds),
            )).all();

        for (const activity of sourceActivities) {
            const { id: activityId, ...rest } = activity;
            const existingTarget = db
                .select()
                .from(userMediaMonthlyActivity)
                .where(and(
                    eq(userMediaMonthlyActivity.userId, activity.userId),
                    eq(userMediaMonthlyActivity.mediaId, targetBookId),
                    eq(userMediaMonthlyActivity.mediaType, MediaType.BOOKS),
                    eq(userMediaMonthlyActivity.monthBucket, activity.monthBucket),
                )).get();

            if (!existingTarget) {
                db.insert(userMediaMonthlyActivity)
                    .values({ ...rest, mediaId: targetBookId })
                    .run();
            }
            else if (existingTarget.hidden === activity.hidden) {
                db.update(userMediaMonthlyActivity)
                    .set({
                        redoGained: existingTarget.redoGained + activity.redoGained,
                        progressGained: existingTarget.progressGained + activity.progressGained,
                        hadCompletion: existingTarget.hadCompletion || activity.hadCompletion,
                        lastActivityAt: existingTarget.lastActivityAt > activity.lastActivityAt
                            ? existingTarget.lastActivityAt
                            : activity.lastActivityAt,
                    }).where(eq(userMediaMonthlyActivity.id, existingTarget.id))
                    .run();
            }
            else if (existingTarget.hidden && !activity.hidden) {
                db.update(userMediaMonthlyActivity)
                    .set({
                        hidden: false,
                        redoGained: activity.redoGained,
                        hadCompletion: activity.hadCompletion,
                        progressGained: activity.progressGained,
                        lastActivityAt: activity.lastActivityAt,
                    }).where(eq(userMediaMonthlyActivity.id, existingTarget.id))
                    .run();
            }

            db.delete(userMediaMonthlyActivity)
                .where(eq(userMediaMonthlyActivity.id, activityId))
                .run();
        }

        // Re-point collections while avoiding (collection_id, media_type, media_id) collisions and compacting order_index
        const sourceCollectionRows = db
            .select({
                id: collectionItems.id,
                mediaId: collectionItems.mediaId,
                collectionId: collectionItems.collectionId,
            }).from(collectionItems)
            .where(and(
                eq(collectionItems.mediaType, MediaType.BOOKS),
                inArray(collectionItems.mediaId, sourceBookIds),
            )).orderBy(asc(collectionItems.collectionId), asc(collectionItems.orderIndex))
            .all();

        if (sourceCollectionRows.length > 0) {
            const touchedCollectionIds = [...new Set(sourceCollectionRows.map(row => row.collectionId))];
            const collectionsWithTarget = new Set(
                db.select({ collectionId: collectionItems.collectionId })
                    .from(collectionItems)
                    .where(and(
                        eq(collectionItems.mediaType, MediaType.BOOKS),
                        eq(collectionItems.mediaId, targetBookId),
                        inArray(collectionItems.collectionId, touchedCollectionIds),
                    )).all()
                    .map(row => row.collectionId),
            );

            for (const row of sourceCollectionRows) {
                if (!collectionsWithTarget.has(row.collectionId)) {
                    db.update(collectionItems)
                        .set({ mediaId: targetBookId })
                        .where(eq(collectionItems.id, row.id))
                        .run();
                    collectionsWithTarget.add(row.collectionId);
                }
                else {
                    CollectionsRepository.deleteCollectionItem(row.collectionId, row.mediaId, MediaType.BOOKS);
                }
            }
        }

        // Re-point update history, stats history, notifications, and import item references
        db.update(userMediaUpdate)
            .set({ mediaId: targetBookId })
            .where(and(
                eq(userMediaUpdate.mediaType, MediaType.BOOKS),
                inArray(userMediaUpdate.mediaId, sourceBookIds),
            )).run();

        db.update(userMediaStatsHistory)
            .set({ mediaId: targetBookId })
            .where(and(
                eq(userMediaStatsHistory.mediaType, MediaType.BOOKS),
                inArray(userMediaStatsHistory.mediaId, sourceBookIds),
            )).run();

        db.update(mediaNotifications)
            .set({ mediaId: targetBookId })
            .where(and(
                eq(mediaNotifications.mediaType, MediaType.BOOKS),
                inArray(mediaNotifications.mediaId, sourceBookIds),
            )).run();

        db.update(importItems)
            .set({ matchedMediaId: targetBookId })
            .where(and(
                eq(importItems.mediaType, MediaType.BOOKS),
                inArray(importItems.matchedMediaId, sourceBookIds),
            )).run();

        // Re-point profile highlighted media JSON references and deduplicate
        const highlightedRows = db
            .select({ id: profileCustom.id, value: profileCustom.value })
            .from(profileCustom)
            .where(eq(profileCustom.key, "highlightedMedia"))
            .all();

        for (const row of highlightedRows) {
            const settings = row.value as HighlightedMediaSettings | null;
            if (!settings) continue;

            let changed = false;
            const rewriteItems = (items: { mediaId: number; mediaType: MediaType }[] | undefined) => {
                if (!items) return items;
                const seen = new Set<string>();
                const next: { mediaId: number; mediaType: MediaType }[] = [];

                for (const item of items) {
                    const remapped = item.mediaType === MediaType.BOOKS && sourceIdSet.has(item.mediaId)
                        ? { ...item, mediaId: targetBookId }
                        : item;

                    if (remapped.mediaId !== item.mediaId) changed = true;

                    const key = `${remapped.mediaType}:${remapped.mediaId}`;
                    if (seen.has(key)) {
                        changed = true;
                        continue;
                    }
                    seen.add(key);
                    next.push(remapped);
                }

                return next;
            };

            const nextSettings: HighlightedMediaSettings = {
                ...settings,
                overview: settings.overview
                    ? { ...settings.overview, items: rewriteItems(settings.overview.items) ?? [] }
                    : settings.overview,
                [MediaType.BOOKS]: settings[MediaType.BOOKS]
                    ? { ...settings[MediaType.BOOKS], items: rewriteItems(settings[MediaType.BOOKS].items) ?? [] }
                    : settings[MediaType.BOOKS],
            };

            if (changed) {
                db.update(profileCustom)
                    .set({ value: nextSettings, updatedAt: sql`datetime('now')` })
                    .where(eq(profileCustom.id, row.id))
                    .run();
            }
        }

        // Remove stale WCF catalog entries and delete source books (cascades books_authors & books_genre)
        db.delete(whichCameFirstMedia)
            .where(and(
                eq(whichCameFirstMedia.mediaType, MediaType.BOOKS),
                inArray(whichCameFirstMedia.mediaId, sourceBookIds),
            )).run();

        db.delete(books)
            .where(inArray(books.id, sourceBookIds))
            .run();

        return {
            targetBookId,
            movedListEntries,
            duplicateListEntriesRemoved,
            mergedBookCount: sourceBookIds.length,
            recomputeStatsUserIds: [...recomputeStatsUserIds],
        };
    }

    static async getUserMediaAddedAndUpdatedForAdmin(mediaType: MediaType) {
        const { listTable } = getServerMediaDefinition(mediaType).repository.tables;

        const [addedThisMonth] = await getDbClient()
            .select({ count: countDistinct(listTable.id) })
            .from(listTable)
            .where(gte(listTable.addedAt, sql`date('now', 'start of month')`));

        const [addedLastMonth] = await getDbClient()
            .select({ count: countDistinct(listTable.id) })
            .from(listTable)
            .where(and(
                gte(listTable.addedAt, sql`date('now', '-1 month', 'start of month')`),
                lt(listTable.addedAt, sql`date('now', 'start of month')`)
            ));

        const [updatedThisMonth] = await getDbClient()
            .select({ count: countDistinct(listTable.mediaId) })
            .from(listTable)
            .where(gte(listTable.lastUpdated, sql`date('now', 'start of month')`));

        return {
            added: {
                thisMonth: addedThisMonth?.count || 0,
                lastMonth: addedLastMonth?.count || 0,
                comparedToLastMonth: (addedThisMonth?.count || 0) - (addedLastMonth?.count || 0),
            },
            updated: {
                thisMonth: updatedThisMonth?.count || 0,
            }
        };
    }

    static async getYearRecapReleaseMode(year: number): Promise<YearRecapReleaseMode> {
        return getDbClient()
            .select({ mode: yearRecapRelease.mode })
            .from(yearRecapRelease)
            .where(eq(yearRecapRelease.year, year))
            .get()?.mode ?? "automatic";
    }

    static async getYearRecapReleaseModes(startYear: number, endYear: number) {
        return getDbClient()
            .select({
                year: yearRecapRelease.year,
                mode: yearRecapRelease.mode,
            }).from(yearRecapRelease)
            .where(and(lte(yearRecapRelease.year, endYear), gte(yearRecapRelease.year, startYear)));
    }

    static async updateYearRecapReleaseMode(year: number, mode: YearRecapReleaseMode) {
        await getDbClient()
            .insert(yearRecapRelease)
            .values({
                year,
                mode,
                updatedAt: new Date().toISOString(),
            })
            .onConflictDoUpdate({
                target: yearRecapRelease.year,
                set: {
                    mode,
                    updatedAt: new Date().toISOString(),
                },
            });
    }

    static async getCollectionsOverview() {
        const currentMonthStart = sql`datetime('now', 'start of month')`;
        const previousMonthStart = sql`datetime('now', '-1 month', 'start of month')`;

        const result = getDbClient()
            .select({
                total: count(collections.id).as("total"),
                uniqueOwners: countDistinct(collections.ownerId).as("uniqueOwners"),
                totalViews: sql<number>`coalesce(sum(${collections.viewCount}), 0)`.as("totalViews"),
                totalLikes: sql<number>`coalesce(sum(${collections.likeCount}), 0)`.as("totalLikes"),
                totalCopies: sql<number>`coalesce(sum(${collections.copiedCount}), 0)`.as("totalCopies"),
                publicCount: sql<number>`sum(case when ${collections.privacy} = ${PrivacyType.PUBLIC} then 1 else 0 end)`.as("publicCount"),
                privateCount: sql<number>`sum(case when ${collections.privacy} = ${PrivacyType.PRIVATE} then 1 else 0 end)`.as("privateCount"),
                restrictedCount: sql<number>`sum(case when ${collections.privacy} = ${PrivacyType.RESTRICTED} then 1 else 0 end)`.as("restrictedCount"),
                createdThisMonth: sql<number>`sum(case when ${collections.createdAt} >= ${currentMonthStart} then 1 else 0 end)`.as("createdThisMonth"),
                createdPreviousMonth: sql<number>`sum(case
                    when ${collections.createdAt} >= ${previousMonthStart}
                    and ${collections.createdAt} < ${currentMonthStart}
                    then 1 else 0 end
                )`.as("createdPreviousMonth"),
            })
            .from(collections)
            .get();

        const mediaCounts = getDbClient()
            .select({
                mediaType: collectionItems.mediaType,
                count: countDistinct(collectionItems.collectionId),
            })
            .from(collectionItems)
            .groupBy(collectionItems.mediaType)
            .all();

        return {
            total: result?.total ?? 0,
            totalViews: result?.totalViews ?? 0,
            totalLikes: result?.totalLikes ?? 0,
            totalCopies: result?.totalCopies ?? 0,
            uniqueOwners: result?.uniqueOwners ?? 0,
            createdThisMonth: result?.createdThisMonth ?? 0,
            createdPreviousMonth: result?.createdPreviousMonth ?? 0,
            collectionsPerPrivacy: [
                { privacy: PrivacyType.PUBLIC, count: result?.publicCount ?? 0 },
                { privacy: PrivacyType.PRIVATE, count: result?.privateCount ?? 0 },
                { privacy: PrivacyType.RESTRICTED, count: result?.restrictedCount ?? 0 },
            ],
            collectionsPerMediaType: ALL_MEDIA_TYPES.map(mediaType => ({
                mediaType,
                count: mediaCounts.find(entry => entry.mediaType === mediaType)?.count ?? 0,
            })),
        };
    }

    static async getListsCreatedPerMonth() {
        const results = getDbClient()
            .all<{ month: string; collections: number; dynamicLists: number }>(sql`
                SELECT 
                    month, 
                    sum(collections) as collections, 
                    sum(dynamicLists) as dynamicLists
                FROM (
                    SELECT 
                        strftime('%Y-%m', ${collections.createdAt}) as month, 
                        count(*) as collections, 
                        0 as dynamicLists
                    FROM ${collections} GROUP BY month
                    UNION ALL
                    SELECT 
                        strftime('%Y-%m', ${dynamicLists.createdAt}) as month, 
                        0 as collections, 
                        count(*) as dynamicLists
                    FROM ${dynamicLists} GROUP BY month
                ) GROUP BY month 
                ORDER BY month ASC
            `);

        return results.map((row) => ({
            collections: Number(row.collections),
            dynamicLists: Number(row.dynamicLists),
            month: formatMonthYear(row.month),
        }));
    }

    static async getDynamicListsOverview() {
        const result = getDbClient().select({
            total: count(),
            uniqueOwners: countDistinct(dynamicLists.userId),
            createdThisMonth: sql<number>`coalesce(sum(case when ${dynamicLists.createdAt} >= datetime('now', 'start of month') then 1 else 0 end), 0)`,
            createdPreviousMonth: sql<number>`coalesce(sum(case when ${dynamicLists.createdAt} >= datetime('now', '-1 month', 'start of month')
                and ${dynamicLists.createdAt} < datetime('now', 'start of month') then 1 else 0 end), 0)`,
        }).from(dynamicLists).get()!;

        const mediaCounts = getDbClient().all<{ mediaType: MediaType; count: number }>(sql`
            SELECT media.value as mediaType, count(*) as count
            FROM ${dynamicLists}, json_each(case
                when json_extract(${dynamicLists.spec}, '$.mediaTypes') = 'all' then ${JSON.stringify(ALL_MEDIA_TYPES)}
                else json_extract(${dynamicLists.spec}, '$.mediaTypes') end) media
            GROUP BY media.value
        `);

        return {
            ...result,
            perMediaType: ALL_MEDIA_TYPES.map(mt => ({ mediaType: mt, count: mediaCounts.find(e => e.mediaType === mt)?.count ?? 0 })),
        };
    }

    static async getPaginatedDynamicListsForAdmin(data: SearchType) {
        const search = data.search?.trim();
        const title = sql<string>`json_extract(${dynamicLists.spec}, '$.title')`;

        const where = search
            ? or(like(title, `%${search}%`), like(user.name, `%${search}%`))
            : undefined;

        const sorting = resolveSorting(
            data.sorting,
            ["id", "title", "ownerName", "privacy", "createdAt"] as const,
            "createdAt",
        );

        const orderColumn = {
            id: dynamicLists.id,
            title,
            ownerName: user.name,
            privacy: user.privacy,
            createdAt: dynamicLists.createdAt,
        }[sorting];

        return paginate({
            page: data.page,
            defaultPerPage: 12,
            perPage: data.perPage,
            getTotal: () => {
                return getDbClient()
                    .select({ count: count() })
                    .from(dynamicLists)
                    .innerJoin(user, eq(user.id, dynamicLists.userId))
                    .where(where)
                    .get()!.count;
            },
            getItems: async ({ limit, offset }) => {
                const rows = getDbClient()
                    .select({
                        id: dynamicLists.id,
                        ownerId: user.id,
                        ownerName: user.name,
                        ownerImage: user.image,
                        privacy: user.privacy,
                        spec: dynamicLists.spec,
                        createdAt: dynamicLists.createdAt,
                        updatedAt: dynamicLists.updatedAt,
                    }).from(dynamicLists)
                    .innerJoin(user, eq(user.id, dynamicLists.userId))
                    .where(where)
                    .orderBy(data.sortDesc === false ? asc(orderColumn) : desc(orderColumn), desc(dynamicLists.id))
                    .limit(limit)
                    .offset(offset)
                    .all();

                return rows.map(({ spec, ...row }) => ({
                    ...row,
                    ordered: false,
                    viewCount: null,
                    likeCount: null,
                    itemsCount: null,
                    copiedCount: null,
                    title: spec.title,
                    mediaTypes: spec.mediaTypes === "all" ? [...ALL_MEDIA_TYPES] : spec.mediaTypes,
                }));
            },
        });
    }

    static async getPaginatedCollectionsForAdmin(data: SearchType) {
        const sortDesc = data.sortDesc ?? true;
        const search = data.search?.trim() ?? "";

        const allowedSorts = ["id", "title", "createdAt", "privacy", "viewCount", "likeCount", "copiedCount", "ownerName"] as const;
        const sorting = resolveSorting(data.sorting, allowedSorts, "createdAt");

        const searchCondition = search
            ? or(like(collections.title, `%${search}%`), like(user.name, `%${search}%`))
            : undefined;

        const orderColumn = (() => {
            switch (sorting) {
                case "id":
                    return collections.id;
                case "title":
                    return collections.title;
                case "privacy":
                    return collections.privacy;
                case "viewCount":
                    return collections.viewCount;
                case "likeCount":
                    return collections.likeCount;
                case "copiedCount":
                    return collections.copiedCount;
                case "ownerName":
                    return user.name;
                case "createdAt":
                default:
                    return collections.createdAt;
            }
        })();

        return paginate({
            page: data.page,
            defaultPerPage: 12,
            perPage: data.perPage,
            getTotal: async () => {
                return getDbClient()
                    .select({ count: count() })
                    .from(collections)
                    .innerJoin(user, eq(user.id, collections.ownerId))
                    .where(searchCondition)
                    .get()?.count ?? 0;
            },
            getItems: ({ limit, offset }) => {
                const query = getDbClient()
                    .select({
                        ownerId: user.id,
                        id: collections.id,
                        ownerName: user.name,
                        ownerImage: user.image,
                        title: collections.title,
                        ordered: collections.ordered,
                        privacy: collections.privacy,
                        viewCount: collections.viewCount,
                        likeCount: collections.likeCount,
                        createdAt: collections.createdAt,
                        updatedAt: collections.updatedAt,
                        copiedCount: collections.copiedCount,
                        mediaTypes: getCollectionMediaTypesSelection(),
                        itemsCount: sql<number>`(
                            SELECT COUNT(*)
                            FROM collection_items
                            WHERE collection_items.collection_id = ${collections.id}
                        )`.as("itemsCount"),
                    })
                    .from(collections)
                    .innerJoin(user, eq(user.id, collections.ownerId))
                    .$dynamic();

                return (searchCondition ? query.where(searchCondition) : query)
                    .orderBy(sortDesc ? desc(orderColumn) : asc(orderColumn))
                    .offset(offset)
                    .limit(limit);
            },
        });
    }

    static async saveTaskToDb(data: SaveTaskToDb) {
        await getDbClient()
            .insert(taskHistory)
            .values({
                logs: data.logs,
                taskId: data.taskId,
                status: data.status,
                taskName: data.taskName,
                startedAt: data.startedAt,
                finishedAt: data.finishedAt,
                triggeredBy: data.triggeredBy,
                errorMessage: data.errorMessage ?? null,
                userId: "userId" in data ? data.userId : null,
            });
    }

    static async deleteArchivedTaskForAdmin(taskId: string) {
        await getDbClient()
            .delete(taskHistory)
            .where(eq(taskHistory.taskId, taskId));
    }

    static async getArchivedTasksForAdmin() {
        return getDbClient()
            .select()
            .from(taskHistory)
            .orderBy(desc(taskHistory.startedAt));
    }

    static async logMediaRefresh(params: { userId: number; mediaType: MediaType; apiId: number | string }) {
        await getDbClient()
            .insert(mediaRefreshLog)
            .values({
                userId: params.userId,
                mediaType: params.mediaType,
                apiId: String(params.apiId),
            });
    }

    static async getMediaRefreshDailyCountsByType(days?: number | null) {
        const dateFilter = this._buildMediaRefreshDateFilter(days);

        const query = getDbClient()
            .select({
                mediaType: mediaRefreshLog.mediaType,
                count: count(mediaRefreshLog.id).as("count"),
                date: sql<string>`date(${mediaRefreshLog.refreshedAt})`.as("date"),
            })
            .from(mediaRefreshLog)
            .$dynamic();

        return (dateFilter ? query.where(dateFilter) : query)
            .groupBy(sql`date(${mediaRefreshLog.refreshedAt})`, mediaRefreshLog.mediaType)
            .orderBy(sql`date(${mediaRefreshLog.refreshedAt})`);
    }

    static async getMediaRefreshTopUsers(days: number | null) {
        const dateFilter = this._buildMediaRefreshDateFilter(days);

        const query = getDbClient()
            .select({
                name: user.name,
                role: user.role,
                userId: mediaRefreshLog.userId,
                count: count(mediaRefreshLog.id).as("count"),
            })
            .from(mediaRefreshLog)
            .innerJoin(user, eq(user.id, mediaRefreshLog.userId))
            .$dynamic();

        return (dateFilter ? query.where(dateFilter) : query)
            .groupBy(mediaRefreshLog.userId, user.name, user.role)
            .orderBy(desc(count(mediaRefreshLog.id).as("count")))
            .limit(8);
    }

    static async getMediaRefreshTotalsByRole() {
        return getDbClient()
            .select({
                role: user.role,
                count: count(mediaRefreshLog.id).as("count"),
                userCount: countDistinct(mediaRefreshLog.userId).as("userCount"),
            })
            .from(mediaRefreshLog)
            .innerJoin(user, eq(user.id, mediaRefreshLog.userId))
            .groupBy(user.role)
            .orderBy(desc(sql`count(${mediaRefreshLog.id})`));
    }

    static async getMediaRefreshTotalsByType() {
        return getDbClient()
            .select({
                mediaType: mediaRefreshLog.mediaType,
                count: count(mediaRefreshLog.id).as("count"),
            })
            .from(mediaRefreshLog)
            .groupBy(mediaRefreshLog.mediaType)
            .orderBy(desc(count(mediaRefreshLog.id)));
    }

    static async getMediaRefreshSummary() {
        const [summary, busiestDay] = await Promise.all([
            getDbClient()
                .select({
                    total: count(mediaRefreshLog.id).as("total"),
                    uniqueUsers: countDistinct(mediaRefreshLog.userId).as("uniqueUsers"),
                    firstRefreshDate: sql<string | null>`min(date(${mediaRefreshLog.refreshedAt}))`.as("firstRefreshDate"),
                })
                .from(mediaRefreshLog)
                .get(),
            getDbClient()
                .select({
                    count: count(mediaRefreshLog.id).as("count"),
                    date: sql<string>`date(${mediaRefreshLog.refreshedAt})`.as("date"),
                })
                .from(mediaRefreshLog)
                .groupBy(sql`date(${mediaRefreshLog.refreshedAt})`)
                .orderBy(desc(sql`count(${mediaRefreshLog.id})`), desc(sql`date(${mediaRefreshLog.refreshedAt})`))
                .limit(1)
                .get(),
        ]);

        return {
            total: Number(summary?.total ?? 0),
            busiestDay: busiestDay?.date ?? "",
            busiestCount: Number(busiestDay?.count ?? 0),
            uniqueUsers: Number(summary?.uniqueUsers ?? 0),
            firstRefreshDate: summary?.firstRefreshDate ?? null,
        };
    }

    static async getRecentMediaRefreshes(page: number) {
        return paginate({
            page,
            maxPerPage: 30,
            defaultPerPage: 12,
            getTotal: async () => {
                return getDbClient()
                    .select({ count: count() })
                    .from(mediaRefreshLog)
                    .get()?.count ?? 0;
            },
            getItems: ({ limit, offset }) => {
                return getDbClient()
                    .select({
                        name: user.name,
                        role: user.role,
                        apiId: mediaRefreshLog.apiId,
                        userId: mediaRefreshLog.userId,
                        mediaType: mediaRefreshLog.mediaType,
                        refreshedAt: mediaRefreshLog.refreshedAt,
                    })
                    .from(mediaRefreshLog)
                    .innerJoin(user, eq(user.id, mediaRefreshLog.userId))
                    .orderBy(desc(mediaRefreshLog.refreshedAt))
                    .offset(offset)
                    .limit(limit);
            },
        });
    }

    static async getApiCallProviders() {
        const rows = await getDbClient()
            .select({ provider: apiCallRollup.provider })
            .from(apiCallRollup)
            .groupBy(apiCallRollup.provider)
            .orderBy(apiCallRollup.provider);

        return rows.map((row) => row.provider);
    }

    static async getApiCallDailyCountsByProvider(days?: number | null) {
        const dateFilter = days
            ? gte(sql`date(${apiCallRollup.bucketStart})`, sql`date('now', ${`-${Math.max(days - 1, 0)} day`})`)
            : undefined;

        const query = getDbClient()
            .select({
                provider: apiCallRollup.provider,
                count: sql<number>`sum(${apiCallRollup.total})`.as("count"),
                date: sql<string>`date(${apiCallRollup.bucketStart})`.as("date"),
            })
            .from(apiCallRollup)
            .$dynamic();

        return (dateFilter ? query.where(dateFilter) : query)
            .groupBy(sql`date(${apiCallRollup.bucketStart})`, apiCallRollup.provider)
            .orderBy(sql`date(${apiCallRollup.bucketStart})`);
    }

    static async getApiCallTotalsByProvider(days?: number | null) {
        const dateFilter = this._buildApiCallMsFilter(days);

        const query = getDbClient()
            .select({
                provider: apiCallRollup.provider,
                count: sql<number>`sum(${apiCallRollup.total})`.as("count"),
                errors: sql<number>`sum(${apiCallRollup.errors})`.as("errors"),
                avgDurationMs: sql<number>`round(sum(${apiCallRollup.durationMsTotal}) / nullif(sum(${apiCallRollup.total}), 0), 0)`.as("avgDurationMs"),
            })
            .from(apiCallRollup)
            .$dynamic();

        return (dateFilter ? query.where(dateFilter) : query)
            .groupBy(apiCallRollup.provider)
            .orderBy(desc(sql`sum(${apiCallRollup.total})`));
    }

    static async getApiCallStatusTotals(days?: number | null) {
        const dateFilter = this._buildApiCallMsFilter(days);

        const rows = await getDbClient()
            .select()
            .from(apiCallRollup)
            .where(dateFilter);

        const counts = new Map<string, number>();
        for (const row of rows) {
            for (const [status, value] of Object.entries(row.statusCounts)) {
                counts.set(status, (counts.get(status) ?? 0) + Number(value));
            }
        }

        return Array.from(counts.entries())
            .map(([status, count]) => ({ status: status === "network-error" ? null : status, count }))
            .sort((a, b) => b.count - a.count);
    }

    static async getApiCallSummary(days?: number | null) {
        const dateFilter = this._buildApiCallMsFilter(days);

        const summaryQuery = getDbClient()
            .select({
                total: sql<number>`coalesce(sum(${apiCallRollup.total}), 0)`.as("total"),
                failed: sql<number>`coalesce(sum(${apiCallRollup.errors}), 0)`.as("failed"),
                lastCallAt: sql<string | null>`max(${apiCallRollup.bucketStart})`.as("lastCallAt"),
                firstCallAt: sql<string | null>`min(${apiCallRollup.bucketStart})`.as("firstCallAt"),
                avgDurationMs: sql<number>`round(sum(${apiCallRollup.durationMsTotal}) / nullif(sum(${apiCallRollup.total}), 0), 0)`.as("avgDurationMs"),
            })
            .from(apiCallRollup)
            .$dynamic();

        const busiestDayQuery = getDbClient()
            .select({
                count: sql<number>`sum(${apiCallRollup.total})`.as("count"),
                date: sql<string>`date(${apiCallRollup.bucketStart})`.as("date"),
            })
            .from(apiCallRollup)
            .$dynamic();

        const busiestSecondQuery = getDbClient()
            .select({
                count: sql<number>`max(${apiCallRollup.maxSecondBurst})`.as("count"),
                bucketStartMs: apiCallRollup.bucketStartMs,
            })
            .from(apiCallRollup)
            .$dynamic();

        const busiestMinuteQuery = getDbClient()
            .select({
                count: sql<number>`sum(${apiCallRollup.total})`.as("count"),
                bucketStartMs: apiCallRollup.bucketStartMs,
            })
            .from(apiCallRollup)
            .$dynamic();

        const [summary, busiestDay, busiestSecond, busiestMinute] = await Promise.all([
            (dateFilter ? summaryQuery.where(dateFilter) : summaryQuery).get(),
            (dateFilter ? busiestDayQuery.where(dateFilter) : busiestDayQuery)
                .groupBy(sql`date(${apiCallRollup.bucketStart})`)
                .orderBy(desc(sql`sum(${apiCallRollup.total})`), desc(sql`date(${apiCallRollup.bucketStart})`))
                .limit(1)
                .get(),
            (dateFilter ? busiestSecondQuery.where(dateFilter) : busiestSecondQuery)
                .groupBy(apiCallRollup.bucketStartMs)
                .orderBy(desc(sql`max(${apiCallRollup.maxSecondBurst})`))
                .limit(1)
                .get(),
            (dateFilter ? busiestMinuteQuery.where(dateFilter) : busiestMinuteQuery)
                .groupBy(apiCallRollup.bucketStartMs)
                .orderBy(desc(sql`sum(${apiCallRollup.total})`))
                .limit(1)
                .get(),
        ]);

        return {
            total: Number(summary?.total ?? 0),
            busiestDay: busiestDay?.date ?? "",
            failed: Number(summary?.failed ?? 0),
            lastCallAt: summary?.lastCallAt ?? null,
            firstCallAt: summary?.firstCallAt ?? null,
            busiestDayCount: Number(busiestDay?.count ?? 0),
            avgDurationMs: Number(summary?.avgDurationMs ?? 0),
            busiestSecondCount: Number(busiestSecond?.count ?? 0),
            busiestMinuteCount: Number(busiestMinute?.count ?? 0),
            busiestSecond: busiestSecond?.bucketStartMs ? new Date(busiestSecond.bucketStartMs).toISOString() : null,
            busiestMinute: busiestMinute?.bucketStartMs ? new Date(busiestMinute.bucketStartMs).toISOString() : null,
        };
    }

    static async getRecentApiCalls(page: number) {
        return paginate({
            page,
            maxPerPage: 30,
            defaultPerPage: 12,
            getTotal: async () => {
                return getDbClient()
                    .select({ count: count() })
                    .from(apiCallRollup)
                    .get()?.count ?? 0;
            },
            getItems: ({ limit, offset }) => {
                return getDbClient()
                    .select()
                    .from(apiCallRollup)
                    .orderBy(desc(apiCallRollup.bucketStartMs))
                    .offset(offset)
                    .limit(limit);
            },
        });
    }

    static async upsertApiCallRollup(rollup: ProviderApiRollup) {
        await getDbClient()
            .insert(apiCallRollup)
            .values({
                total: rollup.total,
                errors: rollup.errors,
                provider: rollup.provider,
                statusCounts: rollup.statusCounts,
                bucketStartMs: rollup.bucketStartMs,
                maxSecondBurst: rollup.maxSecondBurst,
                durationMsTotal: rollup.durationMsTotal,
                bucketStart: new Date(rollup.bucketStartMs).toISOString(),
            })
            .onConflictDoUpdate({
                target: [apiCallRollup.bucketStartMs, apiCallRollup.provider],
                set: {
                    total: rollup.total,
                    errors: rollup.errors,
                    statusCounts: rollup.statusCounts,
                    maxSecondBurst: rollup.maxSecondBurst,
                    durationMsTotal: rollup.durationMsTotal,
                },
            });
    };

    private static _buildApiCallMsFilter(days?: number | null) {
        if (!days) return undefined;
        return gte(apiCallRollup.bucketStartMs, Date.now() - (Math.max(days, 1) * 24 * 60 * 60 * 1000));
    };

    private static _buildMediaRefreshDateFilter(days?: number | null) {
        if (!days) return undefined;

        const startOffset = `-${Math.max(days - 1, 0)} day`;
        return gte(sql`date(${mediaRefreshLog.refreshedAt})`, sql`date('now', ${startOffset})`);
    };
}
