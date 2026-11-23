import {SearchType} from "@/lib/schemas";
import {SaveTaskToDb} from "@/lib/types/tasks.types";
import {MediaType, PrivacyType, Status} from "@/lib/utils/enums";
import {YearRecapReleaseMode} from "@/lib/types/year-recap.types";
import {getImageFilename} from "@/lib/server/core/images/image-url";
import {paginate, resolveSorting} from "@/lib/server/database/pagination";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {dateFromUTCInput, formatMonthYear} from "@/lib/utils/formatting/date";
import type {HighlightedMediaSettings} from "@/lib/types/profile-custom.types";
import {getDbClient, withTransaction} from "@/lib/server/database/async-storage";
import {mediaRelationArray} from "@/lib/server/domain/media/base/media-relations.queries";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";
import {CollectionsRepository} from "@/lib/server/domain/collections/collections.repository";
import type {AdminBookMergeSearch, AdminMissingCoversSearch} from "@/lib/schemas/admin.schema";
import {getCollectionMediaTypesSelection} from "@/lib/server/domain/collections/collections.queries";
import {and, asc, count, countDistinct, desc, eq, exists, gt, gte, inArray, isNull, like, lt, lte, or, sql} from "drizzle-orm";
import type {AdminBookMergeItem, AdminBookMergePreview, AdminBookMergeReviewProgress, AdminBookMergeSuggestion, ProviderApiRollup} from "@/lib/types/admin.types";
import type {AdminBooksForGroupingInput, AdminListBookMergeSuggestionsInput, AdminMarkBooksReviewedInput, AdminProposeBookMergesInput} from "@/lib/schemas/tool-schemas";
import {
    apiCallRollup,
    bookMergeReview,
    bookMergeSuggestion,
    bookMergeSuggestionBook,
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


const formatGroupKey = (bookIds: number[]) => [...new Set(bookIds)].sort((a, b) => a - b).join(",");

const normalizeBookMatch = (value: string) => value.normalize("NFKD").toLowerCase()
    .replace(/(\p{Script=Latin})\p{M}+/gu, "$1")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim();

const truncateSynopsis = (synopsis: string | null) => {
    if (!synopsis) return null;
    const collapsed = synopsis.replace(/\s+/g, " ").trim();

    if (!collapsed) return null;
    return collapsed.length > 240 ? `${collapsed.slice(0, 237)}...` : collapsed;
};

type DbClient = ReturnType<typeof getDbClient>;
type AuthorReviewGroup = { name: string; bookIds: Set<number>; unreviewedIds: Set<number> };

const getSuggestionBookIdsMap = (db: DbClient, suggestionIds: number[]) => {
    const bookIdsBySuggestion = new Map<number, number[]>();
    if (suggestionIds.length === 0) return bookIdsBySuggestion;

    const links = db
        .select({
            bookId: bookMergeSuggestionBook.bookId,
            suggestionId: bookMergeSuggestionBook.suggestionId,
        })
        .from(bookMergeSuggestionBook)
        .where(inArray(bookMergeSuggestionBook.suggestionId, suggestionIds))
        .all();

    for (const link of links) {
        const list = bookIdsBySuggestion.get(link.suggestionId) ?? [];
        list.push(link.bookId);
        bookIdsBySuggestion.set(link.suggestionId, list);
    }

    return bookIdsBySuggestion;
};

const getAuthorsByReviewStatus = (db: DbClient) => {
    const authorRows = db
        .select({
            bookId: booksAuthors.mediaId,
            name: booksAuthors.name,
            reviewed: sql<number>`CASE WHEN ${bookMergeReview.bookId} IS NULL THEN 0 ELSE 1 END`,
        })
        .from(booksAuthors)
        .leftJoin(bookMergeReview, eq(bookMergeReview.bookId, booksAuthors.mediaId))
        .all();

    const byAuthor = new Map<string, AuthorReviewGroup>();
    for (const row of authorRows) {
        const key = normalizeBookMatch(row.name);
        if (!key) continue;

        const group = byAuthor.get(key) ?? {
            name: row.name,
            bookIds: new Set<number>(),
            unreviewedIds: new Set<number>(),
        };

        group.bookIds.add(row.bookId);
        if (!row.reviewed) group.unreviewedIds.add(row.bookId);
        byAuthor.set(key, group);
    }

    return byAuthor;
};

const upsertReviewedBooks = (db: DbClient, bookIds: Iterable<number>) => {
    const values = [...bookIds].map(bookId => ({ bookId }));
    if (values.length === 0) return;

    db.insert(bookMergeReview)
        .values(values)
        .onConflictDoUpdate({
            target: bookMergeReview.bookId,
            set: { reviewedAt: sql`CURRENT_TIMESTAMP` },
        })
        .run();
};


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
            void firstQuery.unionAll(query);
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

        const pendingSuggestionsCount = db
            .select({ total: count() })
            .from(bookMergeSuggestion)
            .where(eq(bookMergeSuggestion.status, "pending"))
            .get()!.total;

        if (view === "suggestions") {
            const confidenceOrder = sql<number>`CASE ${bookMergeSuggestion.confidence} WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END`;
            const suggestionSelection = {
                id: bookMergeSuggestion.id,
                reason: bookMergeSuggestion.reason,
                createdAt: bookMergeSuggestion.createdAt,
                confidence: bookMergeSuggestion.confidence,
                targetBookId: bookMergeSuggestion.targetBookId,
            };

            const hydrateSuggestions = (rows: {
                id: number;
                reason: string;
                createdAt: string;
                targetBookId: number;
                confidence: AdminBookMergeSuggestion["confidence"];
            }[]): AdminBookMergeSuggestion[] => {
                if (rows.length === 0) return [];

                const bookIdsBySuggestion = getSuggestionBookIdsMap(db, rows.map(row => row.id));
                const bookIds = [...new Set([...bookIdsBySuggestion.values()].flat())];
                const bookRows = bookIds.length > 0
                    ? db.select(selection).from(books).where(inArray(books.id, bookIds)).all()
                    : [];
                const bookById = new Map(bookRows.map(book => [book.id, book]));

                return rows.flatMap(row => {
                    const groupBooks = (bookIdsBySuggestion.get(row.id) ?? []).flatMap(id => bookById.get(id) ?? []);
                    const target = groupBooks.find(book => book.id === row.targetBookId);
                    if (!target || groupBooks.length < 2) return [];

                    const orderedBooks = [
                        target,
                        ...groupBooks
                            .filter(book => book.id !== row.targetBookId)
                            .sort((a, b) => b.usersCount - a.usersCount || a.id - b.id),
                    ];

                    return [{
                        id: row.id,
                        reason: row.reason,
                        books: orderedBooks,
                        createdAt: row.createdAt,
                        confidence: row.confidence,
                        targetBookId: row.targetBookId,
                    }];
                });
            };

            const reviewProgress = AdminRepository.getBookMergeReviewProgress();

            if (!trimmed) {
                return {
                    reviewProgress,
                    pendingSuggestionsCount,
                    kind: "suggestions" as const,
                    ...await paginate({
                        ...pagination,
                        maxPerPage: 50,
                        defaultPerPage: 5,
                        getTotal: () => pendingSuggestionsCount,
                        getItems: async ({ limit, offset }) => {
                            const pageRows = db
                                .select(suggestionSelection)
                                .from(bookMergeSuggestion)
                                .where(eq(bookMergeSuggestion.status, "pending"))
                                .orderBy(asc(confidenceOrder), desc(bookMergeSuggestion.id))
                                .limit(limit)
                                .offset(offset)
                                .all();

                            return hydrateSuggestions(pageRows);
                        },
                    }),
                };
            }

            const pendingRows = db
                .select(suggestionSelection)
                .from(bookMergeSuggestion)
                .where(eq(bookMergeSuggestion.status, "pending"))
                .orderBy(asc(confidenceOrder), desc(bookMergeSuggestion.id))
                .all();

            const numericId = /^#?\d+$/.test(trimmed) ? Number(trimmed.replace(/^#/, "")) : null;
            const searchLower = trimmed.toLowerCase();

            const filtered = hydrateSuggestions(pendingRows).filter(suggestion =>
                suggestion.reason.toLowerCase().includes(searchLower)
                || suggestion.books.some(book =>
                    (numericId !== null && book.id === numericId)
                    || book.name.toLowerCase().includes(searchLower)
                    || (book.authors?.toLowerCase().includes(searchLower) ?? false)
                    || (book.publishers?.toLowerCase().includes(searchLower) ?? false),
                ),
            );

            return {
                reviewProgress,
                pendingSuggestionsCount,
                kind: "suggestions" as const,
                ...await paginate({
                    ...pagination,
                    maxPerPage: 50,
                    defaultPerPage: 5,
                    getTotal: () => filtered.length,
                    getItems: async ({ limit, offset }) => filtered.slice(offset, offset + limit),
                }),
            };
        }

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
                pendingSuggestionsCount,
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
                pendingSuggestionsCount,
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
                pendingSuggestionsCount,
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

        return { kind: "catalog" as const, pendingSuggestionsCount, ...results };
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
                const loserIds = losers.map(row => row.id);
                const loserTags = db
                    .select({ tagId: booksTags.tagId })
                    .from(booksTags)
                    .where(inArray(booksTags.listId, loserIds))
                    .all();

                if (loserTags.length > 0) {
                    db.insert(booksTags)
                        .values(loserTags.map(row => ({ listId: winner.id, tagId: row.tagId })))
                        .onConflictDoNothing()
                        .run();
                }

                db.delete(booksList)
                    .where(inArray(booksList.id, loserIds))
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
                    }).where(eq(booksList.id, winner.id))
                    .run();

                if (losers.every(row => row.mediaId !== targetBookId)) {
                    movedListEntries += 1;
                }
            }
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

        // Remove stale WCF catalog entries, resolved merge suggestions, and source books (cascades authors, genres, review markers)
        db.delete(whichCameFirstMedia)
            .where(and(
                eq(whichCameFirstMedia.mediaType, MediaType.BOOKS),
                inArray(whichCameFirstMedia.mediaId, sourceBookIds),
            )).run();

        AdminRepository.reconcileBookMergeSuggestionsOnBookRemoval(sourceBookIds, targetBookId);

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

    static reconcileBookMergeSuggestionsOnBookRemoval(removedBookIds: number[], replacementBookId?: number) {
        if (removedBookIds.length === 0) return;

        const db = getDbClient();
        const removedIdSet = new Set(removedBookIds);

        const affectedSuggestionIds = db
            .selectDistinct({ suggestionId: bookMergeSuggestionBook.suggestionId })
            .from(bookMergeSuggestionBook)
            .where(inArray(bookMergeSuggestionBook.bookId, removedBookIds))
            .all()
            .map(row => row.suggestionId);

        if (affectedSuggestionIds.length === 0) return;

        const affectedSuggestions = db
            .select({
                id: bookMergeSuggestion.id,
                status: bookMergeSuggestion.status,
                targetBookId: bookMergeSuggestion.targetBookId,
            })
            .from(bookMergeSuggestion)
            .where(inArray(bookMergeSuggestion.id, affectedSuggestionIds))
            .orderBy(asc(sql<number>`CASE ${bookMergeSuggestion.status} WHEN 'pending' THEN 0 ELSE 1 END`), asc(bookMergeSuggestion.id))
            .all();

        const memberIdsBySuggestion = getSuggestionBookIdsMap(db, affectedSuggestionIds);

        const remappedSuggestions = affectedSuggestions.map(suggestion => {
            const members = memberIdsBySuggestion.get(suggestion.id) ?? [];
            const nextMemberIds = replacementBookId !== undefined
                ? [...new Set(members.map(id => removedIdSet.has(id) ? replacementBookId : id))].sort((a, b) => a - b)
                : members.filter(id => !removedIdSet.has(id)).sort((a, b) => a - b);

            const nextTargetBookId = removedIdSet.has(suggestion.targetBookId)
                ? (replacementBookId ?? nextMemberIds[0])
                : suggestion.targetBookId;

            return {
                ...suggestion,
                nextMemberIds,
                nextTargetBookId,
                nextGroupKey: formatGroupKey(nextMemberIds),
            };
        });

        const candidateGroupKeys = [...new Set(
            remappedSuggestions
                .filter(suggestion => suggestion.nextMemberIds.length >= 2)
                .map(suggestion => suggestion.nextGroupKey),
        )];

        const claimedGroupKeys = new Set(
            candidateGroupKeys.length > 0
                ? db.select({ groupKey: bookMergeSuggestion.groupKey })
                    .from(bookMergeSuggestion)
                    .where(inArray(bookMergeSuggestion.groupKey, candidateGroupKeys))
                    .all()
                    .map(row => row.groupKey)
                : [],
        );

        const deleteSuggestionIds: number[] = [];
        for (const suggestion of remappedSuggestions) {
            const shouldDropDismissedOnDelete = replacementBookId === undefined && suggestion.status === "dismissed";
            if (
                shouldDropDismissedOnDelete
                || suggestion.nextMemberIds.length < 2
                || suggestion.nextTargetBookId === undefined
                || claimedGroupKeys.has(suggestion.nextGroupKey)
            ) {
                deleteSuggestionIds.push(suggestion.id);
                continue;
            }

            claimedGroupKeys.add(suggestion.nextGroupKey);
            db.update(bookMergeSuggestion)
                .set({
                    groupKey: suggestion.nextGroupKey,
                    targetBookId: suggestion.nextTargetBookId,
                })
                .where(eq(bookMergeSuggestion.id, suggestion.id))
                .run();

            db.delete(bookMergeSuggestionBook)
                .where(and(
                    eq(bookMergeSuggestionBook.suggestionId, suggestion.id),
                    inArray(bookMergeSuggestionBook.bookId, removedBookIds),
                ))
                .run();

            if (replacementBookId !== undefined) {
                db.insert(bookMergeSuggestionBook)
                    .values({ suggestionId: suggestion.id, bookId: replacementBookId })
                    .onConflictDoNothing()
                    .run();
            }
        }

        if (deleteSuggestionIds.length > 0) {
            db.delete(bookMergeSuggestion)
                .where(inArray(bookMergeSuggestion.id, deleteSuggestionIds))
                .run();
        }
    }

    static dismissBookMergeSuggestion(suggestionId: number) {
        return !!getDbClient()
            .update(bookMergeSuggestion)
            .set({ status: "dismissed", reviewedAt: sql`datetime('now')` })
            .where(and(
                eq(bookMergeSuggestion.id, suggestionId),
                eq(bookMergeSuggestion.status, "pending"),
            )).returning({ id: bookMergeSuggestion.id })
            .get();
    }

    static getBookMergeReviewProgress(precomputedByAuthor?: Map<string, AuthorReviewGroup>): AdminBookMergeReviewProgress {
        const db = getDbClient();

        const totalBooks = db.select({ total: count() }).from(books).get()!.total;
        const reviewedBooks = db.select({ total: count() }).from(bookMergeReview).get()!.total;

        const suggestionCounts = db
            .select({ status: bookMergeSuggestion.status, total: count() })
            .from(bookMergeSuggestion)
            .groupBy(bookMergeSuggestion.status)
            .all();

        let pendingSuggestions = 0;
        let dismissedSuggestions = 0;

        for (const row of suggestionCounts) {
            if (row.status === "pending") pendingSuggestions = row.total;
            else if (row.status === "dismissed") dismissedSuggestions = row.total;
        }

        const byAuthor = precomputedByAuthor ?? getAuthorsByReviewStatus(db);

        let unreviewedAuthorsWithMultipleBooks = 0;
        for (const group of byAuthor.values()) {
            if (group.bookIds.size > 1 && group.unreviewedIds.size > 0) {
                unreviewedAuthorsWithMultipleBooks += 1;
            }
        }

        return {
            totalBooks,
            reviewedBooks,
            pendingSuggestions,
            dismissedSuggestions,
            unreviewedAuthorsWithMultipleBooks,
            unreviewedBooks: Math.max(0, totalBooks - reviewedBooks),
        };
    }

    static getBooksForLlmGrouping(input: AdminBooksForGroupingInput) {
        const db = getDbClient();
        const usersCountExpr = sql<number>`(SELECT COUNT(*) FROM ${booksList} WHERE ${booksList.mediaId} = ${books.id})`;

        const loadBooksByIds = (bookIds: number[]) => {
            if (bookIds.length === 0) return [];

            const uniqueIds = [...new Set(bookIds)];
            const rows = db
                .select({
                    id: books.id,
                    name: books.name,
                    pages: books.pages,
                    language: books.language,
                    synopsis: books.synopsis,
                    publishers: books.publishers,
                    releaseDate: books.releaseDate,
                    reviewedAt: bookMergeReview.reviewedAt,
                    usersCount: usersCountExpr.as("users_count"),
                    authors: mediaRelationArray(booksAuthors, books.id, { name: booksAuthors.name }, booksAuthors.id),
                })
                .from(books)
                .leftJoin(bookMergeReview, eq(bookMergeReview.bookId, books.id))
                .where(inArray(books.id, uniqueIds))
                .all();

            return rows.map(row => ({
                id: row.id,
                name: row.name,
                pages: row.pages,
                language: row.language,
                publishers: row.publishers,
                usersCount: row.usersCount,
                releaseDate: row.releaseDate,
                reviewed: row.reviewedAt !== null,
                synopsis: truncateSynopsis(row.synopsis),
                authors: row.authors.map(author => author.name),
            }));
        };

        const loadExistingSuggestions = (bookIds: number[]) => {
            if (bookIds.length === 0) return [];

            const suggestionIds = db
                .selectDistinct({ suggestionId: bookMergeSuggestionBook.suggestionId })
                .from(bookMergeSuggestionBook)
                .where(inArray(bookMergeSuggestionBook.bookId, [...new Set(bookIds)]))
                .all()
                .map(row => row.suggestionId);

            if (suggestionIds.length === 0) return [];

            const suggestions = db
                .select({
                    id: bookMergeSuggestion.id,
                    status: bookMergeSuggestion.status,
                    reason: bookMergeSuggestion.reason,
                    confidence: bookMergeSuggestion.confidence,
                    targetBookId: bookMergeSuggestion.targetBookId,
                }).from(bookMergeSuggestion)
                .where(inArray(bookMergeSuggestion.id, suggestionIds))
                .orderBy(desc(bookMergeSuggestion.id))
                .all();

            const bookIdsBySuggestion = getSuggestionBookIdsMap(db, suggestionIds);

            return suggestions.map(suggestion => ({
                ...suggestion,
                bookIds: (bookIdsBySuggestion.get(suggestion.id) ?? []).sort((a, b) => a - b),
            }));
        };

        if (input.mode === "authors") {
            const byAuthor = getAuthorsByReviewStatus(db);
            const progress = AdminRepository.getBookMergeReviewProgress(byAuthor);

            if (input.author) {
                const matchedAuthors: string[] = [];
                const matchingBookIds = new Set<number>();

                const targetKey = normalizeBookMatch(input.author);
                const exactGroup = byAuthor.get(targetKey);

                if (exactGroup) {
                    matchedAuthors.push(exactGroup.name);
                    for (const id of exactGroup.bookIds) matchingBookIds.add(id);
                }
                else if (targetKey) {
                    for (const [key, group] of byAuthor) {
                        if (!key.includes(targetKey)) continue;
                        matchedAuthors.push(group.name);
                        for (const id of group.bookIds) matchingBookIds.add(id);
                    }
                }

                const limit = Math.min(input.limit ?? 50, 100);
                const offset = (input.page - 1) * limit;
                const matchingIds = [...matchingBookIds];

                const pageIds = matchingIds.length > 0
                    ? db.select({ id: books.id })
                        .from(books)
                        .where(inArray(books.id, matchingIds))
                        .orderBy(sql`${books.name} COLLATE NOCASE`, asc(books.id))
                        .limit(limit)
                        .offset(offset)
                        .all()
                        .map(row => row.id)
                    : [];

                const bookById = new Map(loadBooksByIds(pageIds).map(book => [book.id, book]));
                const pageBooks = pageIds.flatMap(id => bookById.get(id) ?? []);

                return {
                    progress,
                    matchedAuthors,
                    page: input.page,
                    books: pageBooks,
                    mode: "authors" as const,
                    total: matchingIds.length,
                    pages: Math.ceil(matchingIds.length / limit),
                    existingSuggestions: loadExistingSuggestions(pageIds),
                };
            }

            const maxBooksPerAuthor = 60;
            const limit = Math.min(input.limit ?? 10, 30);

            const candidates = Array.from(byAuthor, ([key, group]) => ({
                key,
                name: group.name,
                bookCount: group.bookIds.size,
                unreviewedCount: group.unreviewedIds.size,
                bookIds: [
                    ...[...group.unreviewedIds].sort((a, b) => a - b),
                    ...[...group.bookIds].filter(id => !group.unreviewedIds.has(id)).sort((a, b) => a - b),
                ],
            })).filter(author => author.bookCount > 1 && (input.includeReviewed || author.unreviewedCount > 0))
                .sort((a, b) => (input.includeReviewed ? 0 : b.unreviewedCount - a.unreviewedCount)
                    || (b.bookCount - a.bookCount)
                    || a.key.localeCompare(b.key));

            const offset = (input.page - 1) * limit;
            const pageAuthors = candidates.slice(offset, offset + limit);

            const fetchedIds = pageAuthors.flatMap(author => author.bookIds.slice(0, maxBooksPerAuthor));
            const bookById = new Map(loadBooksByIds(fetchedIds).map(book => [book.id, book]));

            const authors = pageAuthors.map(author => ({
                key: author.key,
                name: author.name,
                bookCount: author.bookCount,
                unreviewedCount: author.unreviewedCount,
                truncated: author.bookIds.length > maxBooksPerAuthor,
                books: author.bookIds
                    .slice(0, maxBooksPerAuthor)
                    .flatMap(id => bookById.get(id) ?? [])
                    .sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id),
            }));

            return {
                authors,
                progress,
                page: input.page,
                mode: "authors" as const,
                totalAuthors: candidates.length,
                pages: Math.ceil(candidates.length / limit),
                hasMore: candidates.length > offset + pageAuthors.length,
                existingSuggestions: loadExistingSuggestions(fetchedIds),
            };
        }

        const progress = AdminRepository.getBookMergeReviewProgress();

        if (input.mode === "unreviewed") {
            const limit = Math.min(input.limit ?? 50, 100);
            const baseWhere = input.includeReviewed ? undefined : isNull(bookMergeReview.bookId);
            const pageWhere = input.cursor ? and(baseWhere, gt(books.id, input.cursor)) : baseWhere;

            const total = db
                .select({ total: count() })
                .from(books)
                .leftJoin(bookMergeReview, eq(bookMergeReview.bookId, books.id))
                .where(baseWhere)
                .get()!.total;

            const rows = db
                .select({ id: books.id })
                .from(books)
                .leftJoin(bookMergeReview, eq(bookMergeReview.bookId, books.id))
                .where(pageWhere)
                .orderBy(asc(books.id))
                .limit(limit + 1)
                .all()
                .map(row => row.id);

            const hasMore = rows.length > limit;
            const pageIds = rows.slice(0, limit);
            const nextCursor = hasMore ? pageIds[pageIds.length - 1]! : null;

            const bookById = new Map(loadBooksByIds(pageIds).map(book => [book.id, book]));
            const pageBooks = pageIds.flatMap(id => bookById.get(id) ?? []);

            return {
                total,
                hasMore,
                progress,
                nextCursor,
                books: pageBooks,
                mode: "unreviewed" as const,
                existingSuggestions: loadExistingSuggestions(pageIds),
            };
        }

        const trimmed = input.query!.trim();
        const numericId = /^#?\d+$/.test(trimmed) ? Number(trimmed.replace(/^#/, "")) : null;

        const limit = Math.min(input.limit ?? 30, 100);
        const offset = (input.page - 1) * limit;

        const where = or(
            like(books.name, `%${trimmed}%`),
            like(books.apiId, `%${trimmed}%`),
            like(books.publishers, `%${trimmed}%`),
            numericId !== null ? eq(books.id, numericId) : undefined,
            exists(db.select({ id: booksAuthors.id })
                .from(booksAuthors)
                .where(and(eq(booksAuthors.mediaId, books.id), like(booksAuthors.name, `%${trimmed}%`))),
            ),
        );

        const total = db.select({ total: count() }).from(books).where(where).get()!.total;
        const pageIds = db
            .select({ id: books.id })
            .from(books)
            .where(where)
            .orderBy(desc(usersCountExpr), sql`${books.name} COLLATE NOCASE`, asc(books.id))
            .limit(limit)
            .offset(offset)
            .all()
            .map(row => row.id);

        const bookById = new Map(loadBooksByIds(pageIds).map(book => [book.id, book]));
        const pageBooks = pageIds.flatMap(id => bookById.get(id) ?? []);

        return {
            total,
            progress,
            query: trimmed,
            books: pageBooks,
            page: input.page,
            mode: "search" as const,
            pages: Math.ceil(total / limit),
            existingSuggestions: loadExistingSuggestions(pageIds),
        };
    }

    static proposeBookMerges(input: AdminProposeBookMergesInput) {
        return withTransaction(() => {
            const db = getDbClient();

            const allReferencedIds = new Set<number>(input.markReviewedBookIds ?? []);
            for (const proposal of input.proposals) {
                allReferencedIds.add(proposal.targetBookId);
                for (const id of proposal.sourceBookIds) allReferencedIds.add(id);
            }

            const existingIds = new Set(
                allReferencedIds.size > 0
                    ? db.select({ id: books.id }).from(books).where(inArray(books.id, [...allReferencedIds])).all().map(row => row.id)
                    : [],
            );

            const candidateGroupKeys = input.proposals.map(proposal =>
                formatGroupKey([proposal.targetBookId, ...proposal.sourceBookIds]),
            );

            const existingByKey = new Map(
                candidateGroupKeys.length > 0
                    ? db.select({
                        id: bookMergeSuggestion.id,
                        status: bookMergeSuggestion.status,
                        groupKey: bookMergeSuggestion.groupKey,
                    }).from(bookMergeSuggestion)
                        .where(inArray(bookMergeSuggestion.groupKey, [...new Set(candidateGroupKeys)]))
                        .all()
                        .map(row => [row.groupKey, row])
                    : [],
            );

            const seenKeys = new Set<string>();
            const created: {
                id: number;
                confidence: string;
                targetBookId: number;
                sourceBookIds: number[];
            }[] = [];

            const skipped: {
                targetBookId: number;
                sourceBookIds: number[];
                reason: "book_not_found" | "already_pending" | "already_dismissed",
            }[] = [];

            const reviewedBookIds = new Set<number>((input.markReviewedBookIds ?? []).filter(id => existingIds.has(id)));

            for (const proposal of input.proposals) {
                const memberIds = [proposal.targetBookId, ...proposal.sourceBookIds];
                if (memberIds.some(id => !existingIds.has(id))) {
                    skipped.push({
                        reason: "book_not_found",
                        targetBookId: proposal.targetBookId,
                        sourceBookIds: proposal.sourceBookIds,
                    });
                    continue;
                }

                const groupKey = formatGroupKey(memberIds);
                const existing = existingByKey.get(groupKey);
                if (existing) {
                    skipped.push({
                        targetBookId: proposal.targetBookId,
                        sourceBookIds: proposal.sourceBookIds,
                        reason: existing.status === "dismissed" ? "already_dismissed" : "already_pending",
                    });
                    continue;
                }

                if (seenKeys.has(groupKey)) {
                    skipped.push({
                        reason: "already_pending",
                        targetBookId: proposal.targetBookId,
                        sourceBookIds: proposal.sourceBookIds,
                    });
                    continue;
                }

                seenKeys.add(groupKey);
                const [inserted] = db
                    .insert(bookMergeSuggestion)
                    .values({
                        groupKey,
                        status: "pending",
                        reason: proposal.reason,
                        confidence: proposal.confidence,
                        targetBookId: proposal.targetBookId,
                    }).returning({ id: bookMergeSuggestion.id })
                    .all();

                db.insert(bookMergeSuggestionBook)
                    .values(memberIds.map(bookId => ({ suggestionId: inserted.id, bookId })))
                    .run();

                created.push({
                    id: inserted.id,
                    confidence: proposal.confidence,
                    targetBookId: proposal.targetBookId,
                    sourceBookIds: proposal.sourceBookIds,
                });

                for (const id of memberIds) reviewedBookIds.add(id);
            }

            upsertReviewedBooks(db, reviewedBookIds);

            return {
                created,
                skipped,
                createdCount: created.length,
                reviewedCount: reviewedBookIds.size,
            };
        });
    }

    static markBooksReviewed(input: AdminMarkBooksReviewedInput) {
        return withTransaction(() => {
            const db = getDbClient();

            if (input.reset) {
                const cleared = db.delete(bookMergeReview)
                    .returning({ bookId: bookMergeReview.bookId })
                    .all()
                    .length;

                return { reset: true, clearedCount: cleared };
            }

            const requestedIds = [...new Set(input.bookIds!)];
            const existingIds = new Set(
                db.select({ id: books.id })
                    .from(books)
                    .where(inArray(books.id, requestedIds))
                    .all()
                    .map(row => row.id),
            );

            const validIds = requestedIds.filter(id => existingIds.has(id));
            const missingBookIds = requestedIds.filter(id => !existingIds.has(id));

            upsertReviewedBooks(db, validIds);

            return {
                reset: false,
                missingBookIds,
                markedCount: validIds.length,
            };
        });
    }

    static listBookMergeSuggestions({ status, limit }: AdminListBookMergeSuggestionsInput) {
        const db = getDbClient();

        const rows = db
            .select({
                id: bookMergeSuggestion.id,
                status: bookMergeSuggestion.status,
                reason: bookMergeSuggestion.reason,
                createdAt: bookMergeSuggestion.createdAt,
                reviewedAt: bookMergeSuggestion.reviewedAt,
                confidence: bookMergeSuggestion.confidence,
                targetBookId: bookMergeSuggestion.targetBookId,
            }).from(bookMergeSuggestion)
            .where(status === "all" ? undefined : eq(bookMergeSuggestion.status, status))
            .orderBy(desc(bookMergeSuggestion.id))
            .limit(limit)
            .all();

        if (rows.length === 0) return [];

        const bookIdsBySuggestion = getSuggestionBookIdsMap(db, rows.map(row => row.id));
        const bookIds = [...new Set([...bookIdsBySuggestion.values()].flat())];
        const bookRows = bookIds.length > 0
            ? db.select({
                id: books.id,
                name: books.name,
                pages: books.pages,
                language: books.language,
                authors: mediaRelationArray(booksAuthors, books.id, { name: booksAuthors.name }, booksAuthors.id),
            }).from(books)
                .where(inArray(books.id, bookIds))
                .all()
            : [];

        const bookById = new Map(bookRows.map(book => [book.id, {
            id: book.id,
            name: book.name,
            pages: book.pages,
            language: book.language,
            authors: book.authors.map(author => author.name),
        }]));

        return rows.map(row => ({
            ...row,
            books: (bookIdsBySuggestion.get(row.id) ?? []).flatMap(id => bookById.get(id) ?? []),
        }));
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
