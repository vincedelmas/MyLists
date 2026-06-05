import {Status} from "@/lib/utils/enums";
import {AddedMediaDetails} from "@/lib/types/media-common.types";
import {Achievement} from "@/lib/types/achievements.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import {BaseRepository} from "@/lib/server/domain/media/base/base.repository";
import {manga, mangaAuthors, mangaGenre, mangaList} from "@/lib/server/database/schema";
import {Manga, UpsertMangaWithDetails} from "@/lib/server/domain/media/manga/manga.types";
import {mangaConfig, MangaSchemaConfig} from "@/lib/server/domain/media/manga/manga.config";
import {and, asc, count, eq, getTableColumns, gte, inArray, isNotNull, isNull, lte, max, ne, or, sql, sum} from "drizzle-orm";


export class MangaRepository extends BaseRepository<MangaSchemaConfig> {
    config: MangaSchemaConfig;

    constructor() {
        super(mangaConfig);
        this.config = mangaConfig;
    }

    async getMediaIdsToBeRefreshed() {
        const results = await getDbClient()
            .select({ apiId: manga.apiId })
            .from(manga)
            .where(and(
                eq(manga.lockStatus, false),
                lte(manga.lastApiUpdate, sql`datetime('now', '-6 days')`),
                or(
                    isNull(manga.releaseDate),
                    gte(manga.releaseDate, sql`date('now')`),
                    inArray(manga.prodStatus, ["Publishing", "On Hiatus"]),
                ),
            ));

        return results.map((r) => r.apiId);
    }

    // --- Achievements ----------------------------------------------------------

    getDurationAchievementCte(achievement: Achievement, userId?: number) {
        const value = parseInt(achievement.value!, 10);
        const isLong = achievement.codeName.includes("long");
        const condition = isLong ? gte(manga.chapters, value) : lte(manga.chapters, value);

        const baseCTE = getDbClient()
            .select({
                userId: mangaList.userId,
                value: count(mangaList.mediaId).as("value"),
            }).from(mangaList)
            .innerJoin(manga, eq(mangaList.mediaId, manga.id))

        const conditions = [eq(mangaList.status, Status.COMPLETED), condition]

        return this.applyWhereConditionsAndGrouping(baseCTE, conditions, userId);
    }

    getAuthorsAchievementCte(_achievement: Achievement, userId?: number) {
        const subQ = getDbClient()
            .select({
                userId: mangaList.userId,
                count: count(mangaList.mediaId).as("count"),
            }).from(mangaList)
            .innerJoin(mangaAuthors, eq(mangaList.mediaId, mangaAuthors.mediaId))
            .where(eq(mangaList.status, Status.COMPLETED))
            .groupBy(userId ? eq(mangaList.userId, userId) : mangaList.userId, mangaAuthors.name)
            .as("sub");

        return getDbClient()
            .select({
                userId: subQ.userId,
                value: max(subQ.count).as("value"),
            }).from(subQ)
            .groupBy(subQ.userId)
            .as("calculation");
    }

    getPublishersAchievementCte(_achievement: Achievement, userId?: number) {
        const subQ = getDbClient()
            .select({
                userId: mangaList.userId,
                count: count(mangaList.mediaId).as("count"),
            }).from(mangaList)
            .innerJoin(manga, eq(manga.id, mangaList.mediaId))
            .where(eq(mangaList.status, Status.COMPLETED))
            .groupBy(userId ? eq(mangaList.userId, userId) : mangaList.userId, manga.publishers)
            .as("sub");

        return getDbClient()
            .select({
                userId: subQ.userId,
                value: max(subQ.count).as("value"),
            }).from(subQ)
            .groupBy(subQ.userId)
            .as("calculation");
    }

    getChaptersAchievementsCte(_achievement: Achievement, userId?: number) {
        const baseCTE = getDbClient()
            .select({
                userId: mangaList.userId,
                value: sum(mangaList.total).as("value"),
            }).from(mangaList)

        return this.applyWhereConditionsAndGrouping(baseCTE, [], userId);
    }

    // --- Advanced Stats  --------------------------------------------------

    async avgMangaDuration(userId?: number) {
        const forUser = userId ? eq(mangaList.userId, userId) : undefined;

        const avgDuration = await getDbClient()
            .select({
                average: sql<number | null>`avg(${manga.chapters})`
            })
            .from(manga)
            .innerJoin(mangaList, eq(mangaList.mediaId, manga.id))
            .where(and(forUser, ne(mangaList.status, Status.PLAN_TO_READ), isNotNull(manga.chapters)))
            .get();

        return avgDuration?.average ?? null;
    }

    async mangaDurationDistrib(userId?: number) {
        const forUser = userId ? eq(mangaList.userId, userId) : undefined;

        const binning = sql<number>`floor(${manga.chapters} / 50.0) * 50`.mapWith(String);

        return getDbClient()
            .select({
                name: binning,
                value: sql`cast(count(${manga.id}) as int)`.mapWith(Number).as("count"),
            })
            .from(manga)
            .innerJoin(mangaList, eq(mangaList.mediaId, manga.id))
            .where(and(forUser, ne(mangaList.status, Status.PLAN_TO_READ), isNotNull(manga.chapters)))
            .groupBy(binning)
            .orderBy(asc(binning));
    }

    async specificTopMetrics(mediaAvgRating: number | null, userId?: number) {
        const publishersConfig = {
            metricTable: manga,
            metricNameCol: manga.publishers,
            metricIdCol: manga.id,
            mediaLinkCol: mangaList.mediaId,
            filters: [ne(mangaList.status, Status.PLAN_TO_READ)],
        };
        const authorsConfig = {
            metricTable: mangaAuthors,
            metricNameCol: mangaAuthors.name,
            metricIdCol: mangaAuthors.mediaId,
            mediaLinkCol: mangaList.mediaId,
            filters: [ne(mangaList.status, Status.PLAN_TO_READ)],
        };

        const authorsStats = await this.computeTopAffinityStats(authorsConfig, mediaAvgRating, userId);
        const publishersStats = await this.computeTopAffinityStats(publishersConfig, mediaAvgRating, userId);

        return { publishersStats, authorsStats };
    }

    // --- Implemented Methods ------------------------------------------------

    async computeAllUsersStats() {
        // TODO: check how to add the 7 without magic number
        const timeSpentStat = sql<number>`COALESCE(SUM(${mangaList.total} * 7), 0)`;
        const totalSpecificStat = sql<number>`COALESCE(SUM(${mangaList.total}), 0)`;

        return this._computeAllUsersStats(timeSpentStat, totalSpecificStat)
    }

    async addMediaToUserList(userId: number, media: Manga, newStatus: Status) {
        const newTotal = (newStatus === Status.COMPLETED) ? media.chapters! : 0;

        const [newMedia] = await getDbClient()
            .insert(mangaList)
            .values({
                userId: userId,
                total: newTotal,
                status: newStatus,
                mediaId: media.id,
                currentChapter: newTotal,
            })
            .returning();

        return newMedia;
    }

    async findAllAssociatedDetails(mediaId: number) {
        const { apiProvider } = this.config;

        const details = await getDbClient()
            .select({
                ...getTableColumns(manga),
                genres: sql`json_group_array(DISTINCT json_object('id', ${mangaGenre.id}, 'name', ${mangaGenre.name}))`.mapWith(JSON.parse),
                authors: sql`json_group_array(DISTINCT json_object('id', ${mangaAuthors.id}, 'name', ${mangaAuthors.name}))`.mapWith(JSON.parse),
            }).from(manga)
            .leftJoin(mangaAuthors, eq(mangaAuthors.mediaId, manga.id))
            .leftJoin(mangaGenre, eq(mangaGenre.mediaId, manga.id))
            .where(eq(manga.id, mediaId))
            .groupBy(...Object.values(getTableColumns(manga)))
            .get();

        if (!details) return;

        const result: Manga & AddedMediaDetails = {
            ...details,
            providerData: {
                name: apiProvider.name,
                url: `${apiProvider.mediaUrl}${details.apiId}`,
            },
            genres: details.genres || [],
            authors: details.authors || [],
        };

        return result;
    }

    async storeMediaWithDetails({ mediaData, authorsData, genresData }: UpsertMangaWithDetails) {
        const tx = getDbClient();

        const [media] = await tx
            .insert(manga)
            .values({
                ...mediaData,
                lastApiUpdate: sql`datetime('now')`,
            })
            .onConflictDoUpdate({
                target: manga.apiId,
                set: { lastApiUpdate: sql`datetime('now')` },
            })
            .returning();

        const mediaId = media.id;
        if (authorsData && authorsData.length > 0) {
            const authorsToAdd = authorsData.map((a) => ({ mediaId, ...a }));
            await tx.insert(mangaAuthors).values(authorsToAdd)
        }

        if (genresData && genresData.length > 0) {
            const genresToAdd = genresData.map((g) => ({ mediaId, ...g }));
            await tx.insert(mangaGenre).values(genresToAdd)
        }

        return mediaId;
    }

    async updateMediaWithDetails({ mediaData, authorsData, genresData }: UpsertMangaWithDetails) {
        const tx = getDbClient();

        const [media] = await tx
            .update(manga)
            .set({
                ...mediaData,
                lastApiUpdate: sql`datetime('now')`,
            })
            .where(eq(manga.apiId, mediaData.apiId))
            .returning({ id: manga.id });

        const mediaId = media.id;

        if (authorsData && authorsData.length > 0) {
            await tx.delete(mangaAuthors).where(eq(mangaAuthors.mediaId, mediaId));
            const authorsToAdd = authorsData.map((a) => ({ mediaId, ...a }));
            await tx.insert(mangaAuthors).values(authorsToAdd);
        }

        if (genresData && genresData.length > 0) {
            await tx.delete(mangaGenre).where(eq(mangaGenre.mediaId, mediaId));
            const genresToAdd = genresData.map((g) => ({ mediaId, ...g }));
            await tx.insert(mangaGenre).values(genresToAdd);
        }

        return true;
    }

    async getListFilters(userId: number) {
        return await super.getCommonListFilters(userId);
    }
}
