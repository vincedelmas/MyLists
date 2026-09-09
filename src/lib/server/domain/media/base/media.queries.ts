import {notFound} from "@tanstack/react-router";
import {user} from "@/lib/server/database/schema";
import {MediaInfo} from "@/lib/types/activity.types";
import {ExportMediaList} from "@/lib/types/media-list.types";
import {JobType, MediaType, Status} from "@/lib/utils/enums";
import {UpComingMedia} from "@/lib/types/notifications.types";
import {UserMediaWithTags} from "@/lib/types/user-media.types";
import {ProviderSearchResult} from "@/lib/types/provider.types";
import {getDbClient, withTransaction} from "@/lib/server/database/async-storage";
import {AnyServerMediaDefinition} from "@/lib/media-definitions/base/media.definition.server";
import {and, asc, count, countDistinct, desc, eq, getTableColumns, gte, inArray, isNotNull, isNull, like, lte, ne, notInArray, or, SQL, sql} from "drizzle-orm";


const SIMILAR_MAX_GENRES = 10;
const USER_MEDIA_INSERT_BATCH_SIZE = 200;


export function createMediaQueries<TDef extends AnyServerMediaDefinition>(definition: TDef) {
    const { identity, repository: repoDefinition } = definition;

    async function bulkInsertUserMedia(rows: TDef["repository"]["tables"]["listTable"]["$inferInsert"][]) {
        const { listTable } = repoDefinition.tables;

        if (rows.length === 0) return [];

        return withTransaction(() => {
            const insertedRows: TDef["repository"]["tables"]["listTable"]["$inferSelect"][] = [];

            for (let offset = 0; offset < rows.length; offset += USER_MEDIA_INSERT_BATCH_SIZE) {
                const batch = rows.slice(offset, offset + USER_MEDIA_INSERT_BATCH_SIZE);
                const inserted = getDbClient()
                    .insert(listTable)
                    .values(batch)
                    .onConflictDoNothing({ target: [listTable.userId, listTable.mediaId] })
                    .returning().all();

                insertedRows.push(...inserted);
            }

            return insertedRows;
        });
    }

    function getPopularMediaRefs() {
        const { popularity, tables: { mediaTable } } = repoDefinition;

        if (!popularity) return [];

        return getDbClient()
            .select({
                id: mediaTable.id,
                releaseDate: mediaTable.releaseDate,
            })
            .from(mediaTable)
            .where(and(
                popularity.eligibility,
                isNotNull(mediaTable.releaseDate),
                ne(mediaTable.imageCover, ""),
                ne(mediaTable.releaseDate, ""),
                lte(mediaTable.releaseDate, sql`date('now')`),
            )).all().map((row) => ({
                id: row.id as number,
                releaseDate: row.releaseDate! as string,
            }));
    }

    async function searchMediadleSuggestion(query: string, limit = 20) {
        const { mediaTable } = repoDefinition.tables;

        return getDbClient()
            .select({
                id: mediaTable.id,
                name: sql<string>`${mediaTable.name}`,
            })
            .from(mediaTable)
            .where(like(mediaTable.name, `%${query.toLowerCase()}%`))
            .orderBy(mediaTable.name)
            .limit(limit);
    }

    async function searchByName(query: string, limit = 5): Promise<ProviderSearchResult[]> {
        const { mediaType } = identity;
        const { mediaTable } = repoDefinition.tables;

        const results = await getDbClient()
            .select({
                id: mediaTable.apiId,
                name: mediaTable.name,
                image: mediaTable.imageCover,
                date: mediaTable.releaseDate,
            })
            .from(mediaTable)
            .where(like(mediaTable.name, `%${query.toLowerCase()}%`))
            .orderBy(mediaTable.name)
            .limit(limit);

        return results.map((r) => ({ ...r, itemType: mediaType }));
    }

    function removeMediaFromUserList(userId: number, mediaId: number) {
        const { listTable, tagTable } = repoDefinition.tables;

        getDbClient()
            .delete(listTable)
            .where(and(eq(listTable.userId, userId), eq(listTable.mediaId, mediaId))).run();

        getDbClient()
            .delete(tagTable)
            .where(and(eq(tagTable.userId, userId), eq(tagTable.mediaId, mediaId))).run();
    }

    async function findSimilarMedia(mediaId: number) {
        const { mediaTable, genreTable } = repoDefinition.tables;

        const targetGenresSubQuery = getDbClient()
            .select({ name: genreTable.name })
            .from(genreTable)
            .where(eq(genreTable.mediaId, mediaId));

        const similarSub = getDbClient()
            .select({
                mediaId: genreTable.mediaId,
                commonGenreCount: count(genreTable.name).as("common_genre_count")
            })
            .from(genreTable)
            .where(and(ne(genreTable.mediaId, mediaId), inArray(genreTable.name, targetGenresSubQuery)))
            .groupBy(genreTable.mediaId)
            .orderBy(desc(sql`common_genre_count`))
            .limit(SIMILAR_MAX_GENRES)
            .as("similar_media");

        return getDbClient()
            .select({
                mediaId: mediaTable.id,
                mediaName: mediaTable.name,
                mediaCover: mediaTable.imageCover,
                releaseDate: mediaTable.releaseDate,
            })
            .from(similarSub)
            .innerJoin(mediaTable, eq(mediaTable.id, similarSub.mediaId))
            .orderBy(desc(similarSub.commonGenreCount));
    }

    async function getMediaDetailsByIds(mediaIds: number[], userId?: number): Promise<MediaInfo[]> {
        const { mediaTable, listTable } = repoDefinition.tables;

        const uniqueMediaIds = [...new Set(mediaIds)];

        const mediaInfo = await getDbClient()
            .select({
                ...getTableColumns(mediaTable),
                customCover: listTable.customCover,
                inUserList: isNotNull(listTable.userId).mapWith(Boolean).as("inUserList"),
            })
            .from(mediaTable)
            .leftJoin(listTable, and(
                eq(listTable.mediaId, mediaTable.id),
                userId === undefined ? sql`FALSE` : eq(listTable.userId, userId),
            ))
            .where(inArray(mediaTable.id, uniqueMediaIds));

        return mediaInfo as unknown as MediaInfo[];
    }

    async function getMediaDurationsByIds(mediaIds: number[]) {
        const { mediaType } = identity;
        const { mediaTable } = repoDefinition.tables;

        const uniqueMediaIds = [...new Set(mediaIds)];
        if (uniqueMediaIds.length === 0) return [];

        const hasDuration = mediaType === MediaType.SERIES || mediaType === MediaType.ANIME || mediaType === MediaType.MOVIES;
        const durationColumn = hasDuration
            ? (mediaTable as typeof mediaTable & { duration: SQL<number> }).duration
            : sql<number | null>`NULL`;

        return getDbClient()
            .select({
                id: mediaTable.id,
                duration: durationColumn,
            })
            .from(mediaTable)
            .where(inArray(mediaTable.id, uniqueMediaIds));
    }

    function findById(mediaId: number): TDef["repository"]["tables"]["mediaTable"]["$inferSelect"] | undefined {
        const { mediaTable } = repoDefinition.tables;

        return getDbClient()
            .select()
            .from(mediaTable)
            .where(eq(mediaTable.id, mediaId))
            .get();
    }

    async function findByApiId(apiId: number | string): Promise<TDef["repository"]["tables"]["mediaTable"]["$inferSelect"] | undefined> {
        const { mediaTable } = repoDefinition.tables;

        return getDbClient()
            .select()
            .from(mediaTable)
            .where(eq(mediaTable.apiId, apiId))
            .get()
    }

    async function findByApiIds(apiIds: (number | string)[]) {
        const { mediaTable } = repoDefinition.tables;

        if (apiIds.length === 0) return [];
        const uniqueApiIds = [...new Set(apiIds)];
        const matches: { id: number; apiId: number | string }[] = [];

        for (let offset = 0; offset < uniqueApiIds.length; offset += 300) {
            const chunk = uniqueApiIds.slice(offset, offset + 300);
            const rows = await getDbClient()
                .select({
                    id: sql<number>`${mediaTable.id}`,
                    apiId: sql<number | string>`${mediaTable.apiId}`,
                })
                .from(mediaTable)
                .where(inArray(mediaTable.apiId, chunk));

            matches.push(...rows);
        }

        return matches;
    }

    async function findUserMediaIds(userId: number, mediaIds: number[]) {
        const { listTable } = repoDefinition.tables;

        if (mediaIds.length === 0) return [];

        return getDbClient()
            .select({ mediaId: listTable.mediaId })
            .from(listTable)
            .where(and(eq(listTable.userId, userId), inArray(listTable.mediaId, mediaIds)))
            .then((rows) => rows.map(({ mediaId }) => mediaId));
    }

    async function findByNames(names: string[]) {
        const { mediaTable } = repoDefinition.tables;

        if (names.length === 0) return [];

        const uniqueNames = [...new Set(names.map(name => name.trim().toLowerCase()).filter(Boolean))];
        const matches: { id: number; name: string; releaseDate: string | null }[] = [];
        const lowerNames = sql<string>`lower(trim(${mediaTable.name}))`;

        for (let offset = 0; offset < uniqueNames.length; offset += 300) {
            const chunk = uniqueNames.slice(offset, offset + 300);
            const rows = await getDbClient()
                .select({
                    id: sql<number>`${mediaTable.id}`,
                    name: sql<string>`${mediaTable.name}`,
                    releaseDate: sql<string | null>`${mediaTable.releaseDate}`,
                })
                .from(mediaTable)
                .where(inArray(lowerNames, chunk));

            matches.push(...rows);
        }

        return matches;
    }

    function updateUserMediaDetails(userId: number, mediaId: number, updateData: TDef["repository"]["tables"]["listTable"]["$inferSelect"]): TDef["repository"]["tables"]["listTable"]["$inferSelect"] {
        const { listTable } = repoDefinition.tables;

        const [result] = getDbClient()
            .update(listTable)
            .set({
                ...updateData,
                lastUpdated: sql`datetime('now')`,
            })
            .where(and(eq(listTable.userId, userId), eq(listTable.mediaId, mediaId)))
            .returning().all();

        return result;
    }

    function findUserMedia(userId: number | undefined, mediaId: number): UserMediaWithTags<TDef["repository"]["tables"]["listTable"]["$inferSelect"]> | null {
        const { listTable, tagTable } = repoDefinition.tables;

        if (!userId) return null;

        const mainUserMediaData = getDbClient()
            .select({
                ...getTableColumns(listTable),
                ratingSystem: user.ratingSystem,
            })
            .from(listTable)
            .innerJoin(user, eq(user.id, listTable.userId))
            .where(and(eq(listTable.userId, userId), eq(listTable.mediaId, mediaId)))
            .get()

        if (!mainUserMediaData) {
            return null;
        }

        const associatedTags = getDbClient()
            .select({ name: sql<string>`${tagTable.name}` })
            .from(tagTable)
            .where(and(eq(tagTable.mediaId, mediaId), eq(tagTable.userId, userId)))
            .orderBy(asc(tagTable.name)).all();

        if (!associatedTags) {
            return null;
        }

        return {
            ...mainUserMediaData,
            tags: associatedTags,
        };
    }

    async function downloadMediaListAsCSV(userId: number): Promise<(TDef["repository"]["tables"]["listTable"]["$inferSelect"] & ExportMediaList)[] | undefined> {
        const { mediaTable, listTable } = repoDefinition.tables;

        return getDbClient()
            .select({
                mediaName: sql<string>`${mediaTable.name}`,
                externalApiId: sql<string>`${mediaTable.apiId}`,
                releaseDate: sql<string | null>`${mediaTable.releaseDate}`,
                ...getTableColumns(listTable),
            })
            .from(listTable)
            .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
            .where(eq(listTable.userId, userId));
    }

    async function getUpcomingMedia(userId?: number, maxAWeek?: boolean): Promise<UpComingMedia[]> {
        // If userId undefined, returns all media requiring notification to be sent to their respective users.
        // If userId is defined, returns upcoming media from that user's media list.
        // `maxAWeek` should be true only for userId undefined -> media releasing in next 7 days.

        const { listTable, mediaTable } = repoDefinition.tables;

        return getDbClient()
            .select({
                mediaId: mediaTable.id,
                userId: listTable.userId,
                status: listTable.status,
                mediaName: mediaTable.name,
                date: mediaTable.releaseDate,
                imageCover: mediaTable.imageCover,
            })
            .from(mediaTable)
            .innerJoin(listTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(
                notInArray(listTable.status, [Status.DROPPED]),
                userId ? eq(listTable.userId, userId) : undefined,
                maxAWeek ?
                    and(
                        gte(mediaTable.releaseDate, sql`date('now')`),
                        lte(mediaTable.releaseDate, sql`date('now', '+7 days')`),
                    )
                    :
                    or(
                        isNull(mediaTable.releaseDate),
                        gte(mediaTable.releaseDate, sql`date('now')`),
                    )
            )).orderBy(asc(mediaTable.releaseDate));
    }

    // TODO: use the paginate function?
    async function getMediaJobDetails(job: JobType, name: string, offset: number, limit = 25, userId?: number) {
        const { tables: { mediaTable, listTable }, jobs } = repoDefinition;

        const jobHandler = jobs[job];
        if (!jobHandler) throw notFound();

        const hasUser = !!userId;
        const { sourceTable, nameColumn, mediaIdColumn } = jobHandler;

        let dataQuery = getDbClient()
            .selectDistinct({
                mediaId: mediaTable.id,
                mediaName: mediaTable.name,
                imageCover: mediaTable.imageCover,
                releaseDate: mediaTable.releaseDate,
                inUserList: hasUser
                    ? isNotNull(listTable.userId).mapWith(Boolean).as("inUserList")
                    : sql<boolean>`false`.as("inUserList"),
            })
            .from(mediaTable)
            .$dynamic();

        if (hasUser) {
            dataQuery = dataQuery.leftJoin(listTable, and(
                eq(listTable.userId, userId),
                eq(listTable.mediaId, mediaTable.id),
            ));
        }

        let countQuery = getDbClient()
            .select({ value: countDistinct(mediaTable.id) })
            .from(mediaTable)
            .$dynamic();

        if (sourceTable !== mediaTable) {
            const joinCondition = eq(mediaIdColumn, mediaTable.id);
            dataQuery.innerJoin(sourceTable, joinCondition);
            countQuery.innerJoin(sourceTable, joinCondition);
        }

        const filterCondition = jobHandler.getFilter
            ? jobHandler.getFilter(name)
            : like(nameColumn, `%${name}%`);

        dataQuery = dataQuery.where(filterCondition);
        countQuery = countQuery.where(filterCondition);

        const [totalCount, results] = await Promise.all([
            countQuery.get()?.value ?? 0,
            dataQuery.orderBy(asc(mediaTable.releaseDate))
                .limit(limit)
                .offset(offset)
                .execute(),
        ]);

        return {
            items: results,
            total: totalCount,
            pages: Math.ceil(totalCount / limit),
        };
    }

    async function getSearchListFilters(userId: number, query: string, job: JobType) {
        const { tables: { listTable }, jobs } = repoDefinition;

        const jobHandler = jobs[job];
        if (!jobHandler) throw notFound();

        const { sourceTable, nameColumn, mediaIdColumn, postProcess } = jobHandler;

        const results = await getDbClient()
            .selectDistinct({ name: sql<string>`${nameColumn}` })
            .from(sourceTable)
            .innerJoin(listTable, eq(listTable.mediaId, mediaIdColumn))
            .where(and(eq(listTable.userId, userId), like(nameColumn, `%${query}%`)));

        if (postProcess) {
            return postProcess(results);
        }

        return results;
    }

    return {
        findById,
        findByApiId,
        findByNames,
        findByApiIds,
        searchByName,
        findUserMedia,
        findUserMediaIds,
        findSimilarMedia,
        getUpcomingMedia,
        getMediaJobDetails,
        bulkInsertUserMedia,
        getPopularMediaRefs,
        getMediaDetailsByIds,
        getSearchListFilters,
        getMediaDurationsByIds,
        updateUserMediaDetails,
        downloadMediaListAsCSV,
        removeMediaFromUserList,
        searchMediadleSuggestion,
    };
}


export type MediaQueries<TDef extends AnyServerMediaDefinition = AnyServerMediaDefinition> = ReturnType<typeof createMediaQueries<TDef>>;
