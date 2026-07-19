import {Status} from "@/lib/utils/enums";
import {AddedMediaDetails} from "@/lib/types/media-common.types";
import {Achievement} from "@/lib/types/achievements.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import {BaseRepository} from "@/lib/server/domain/media/base/base.repository";
import {books, booksAuthors, booksGenre, booksList} from "@/lib/server/database/schema";
import {Book, InsertBooksWithDetails, UpdateBooksWithDetails} from "@/lib/server/domain/media/books/books.types";
import {BookSchemaConfig, booksConfig} from "@/lib/server/domain/media/books/books.config";
import {and, asc, count, countDistinct, eq, getTableColumns, gte, isNotNull, isNull, lte, max, ne, sql} from "drizzle-orm";


export class BooksRepository extends BaseRepository<BookSchemaConfig> {
    config: BookSchemaConfig;

    constructor() {
        super(booksConfig);
        this.config = booksConfig;
    }

    async getBooksWithoutGenres() {
        return getDbClient()
            .select({
                title: books.name,
                apiId: books.apiId,
                synopsis: books.synopsis,
                authors: sql<string>`group_concat(${booksAuthors.name}, ', ')`,
            })
            .from(books)
            .leftJoin(booksAuthors, eq(booksAuthors.mediaId, books.id))
            .leftJoin(booksGenre, eq(booksGenre.mediaId, books.id))
            .where(isNull(booksGenre.mediaId))
            .groupBy(books.id);
    }

    // --- Achievements ----------------------------------------------------------

    getDurationAchievementCte(achievement: Achievement, userId?: number) {
        const value = parseInt(achievement.value!, 10);
        const isLong = achievement.codeName.includes("long");
        const condition = isLong ? gte(books.pages, value) : lte(books.pages, value);

        const baseCTE = getDbClient()
            .select({
                userId: booksList.userId,
                value: count(booksList.mediaId).as("value"),
            }).from(booksList)
            .innerJoin(books, eq(booksList.mediaId, books.id))

        const conditions = [eq(booksList.status, Status.COMPLETED), condition]

        return this.applyWhereConditionsAndGrouping(baseCTE, conditions, userId);
    }

    getAuthorsAchievementCte(_achievement: Achievement, userId?: number) {
        const subQ = getDbClient()
            .select({
                userId: booksList.userId,
                count: count(booksList.mediaId).as("count"),
            }).from(booksList)
            .innerJoin(booksAuthors, eq(booksList.mediaId, booksAuthors.mediaId))
            .where(eq(booksList.status, Status.COMPLETED))
            .groupBy(userId ? eq(booksList.userId, userId) : booksList.userId, booksAuthors.name)
            .as("sub");

        return getDbClient()
            .select({
                userId: subQ.userId,
                value: max(subQ.count).as("value"),
            }).from(subQ)
            .groupBy(subQ.userId)
            .as("calculation");
    }

    getLanguageAchievementCte(_achievement: Achievement, userId?: number) {
        const baseCTE = getDbClient()
            .select({
                userId: booksList.userId,
                value: countDistinct(books.language).as("value"),
            }).from(booksList)
            .innerJoin(books, eq(booksList.mediaId, books.id))

        const conditions = [eq(booksList.status, Status.COMPLETED)]

        return this.applyWhereConditionsAndGrouping(baseCTE, conditions, userId);
    }

    // --- Advanced Stats  --------------------------------------------------

    async avgBooksDuration(userId?: number) {
        const forUser = userId ? eq(booksList.userId, userId) : undefined;

        const avgDuration = getDbClient()
            .select({
                average: sql<number | null>`avg(${books.pages})`
            })
            .from(books)
            .innerJoin(booksList, eq(booksList.mediaId, books.id))
            .where(and(forUser, ne(booksList.status, Status.PLAN_TO_READ), isNotNull(books.pages)))
            .get();

        return avgDuration?.average ?? null;
    }

    async booksDurationDistrib(userId?: number) {
        const forUser = userId ? eq(booksList.userId, userId) : undefined;

        return getDbClient()
            .select({
                name: sql`floor(${books.pages} / 100.0) * 100`.mapWith(String),
                value: sql`cast(count(${books.id}) as int)`.mapWith(Number).as("count"),
            })
            .from(books)
            .innerJoin(booksList, eq(booksList.mediaId, books.id))
            .where(and(forUser, ne(booksList.status, Status.PLAN_TO_READ), isNotNull(books.pages)))
            .groupBy(sql<number>`floor(${books.pages} / 100.0) * 100`)
            .orderBy(asc(sql<number>`floor(${books.pages} / 100.0) * 100`));
    }

    async specificTopMetrics(mediaAvgRating: number | null, userId?: number) {
        const langsConfig = {
            metricTable: books,
            metricIdCol: books.id,
            metricNameCol: books.language,
            mediaLinkCol: booksList.mediaId,
            filters: [ne(booksList.status, Status.PLAN_TO_READ)],
        };
        const publishersConfig = {
            metricTable: books,
            metricNameCol: books.publishers,
            metricIdCol: books.id,
            mediaLinkCol: booksList.mediaId,
            filters: [ne(booksList.status, Status.PLAN_TO_READ)],
        };
        const authorsConfig = {
            metricTable: booksAuthors,
            mediaLinkCol: booksList.mediaId,
            metricNameCol: booksAuthors.name,
            metricIdCol: booksAuthors.mediaId,
            filters: [ne(booksList.status, Status.PLAN_TO_READ)],
        };

        const langsStats = await this.computeTopAffinityStats(langsConfig, mediaAvgRating, userId);
        const authorsStats = await this.computeTopAffinityStats(authorsConfig, mediaAvgRating, userId);
        const publishersStats = await this.computeTopAffinityStats(publishersConfig, mediaAvgRating, userId);

        return { publishersStats, authorsStats, langsStats };
    }

    // --- Implemented Methods ------------------------------------------------

    async computeAllUsersStats() {
        // TODO: check how to add the 1.7 without magic number
        const timeSpentStat = sql<number>`COALESCE(SUM(${booksList.total} * 1.7), 0)`;
        const totalSpecificStat = sql<number>`COALESCE(SUM(${booksList.total}), 0)`;

        return this._computeAllUsersStats(timeSpentStat, totalSpecificStat)
    }

    async addMediaToUserList(userId: number, media: Book, newStatus: Status) {
        const newTotal = (newStatus === Status.COMPLETED) ? media.pages : 0;

        const [newMedia] = await getDbClient()
            .insert(booksList)
            .values({
                userId,
                total: newTotal,
                status: newStatus,
                mediaId: media.id,
                actualPage: newTotal,
            })
            .returning();

        return newMedia;
    }

    async findAllAssociatedDetails(mediaId: number) {
        const { apiProvider } = this.config;

        const details = getDbClient()
            .select({
                ...getTableColumns(books),
                authors: sql`json_group_array(DISTINCT json_object('id', ${booksAuthors.id}, 'name', ${booksAuthors.name}))`.mapWith(JSON.parse),
                genres: sql`json_group_array(DISTINCT json_object('id', ${booksGenre.id}, 'name', ${booksGenre.name}))`.mapWith(JSON.parse),
            }).from(books)
            .leftJoin(booksAuthors, eq(booksAuthors.mediaId, books.id))
            .leftJoin(booksGenre, eq(booksGenre.mediaId, books.id))
            .where(eq(books.id, mediaId))
            .groupBy(...Object.values(getTableColumns(books)))
            .get();

        if (!details) return;

        const result: Book & AddedMediaDetails = {
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

    async storeMediaWithDetails({ mediaData, authorsData }: InsertBooksWithDetails) {
        const tx = getDbClient();

        const [media] = await tx
            .insert(books)
            .values({
                ...mediaData,
                lastApiUpdate: sql`datetime('now')`,
            })
            .onConflictDoUpdate({
                target: books.apiId,
                set: { lastApiUpdate: sql`datetime('now')` },
            })
            .returning();

        const mediaId = media.id;
        if (authorsData && authorsData.length > 0) {
            const authorsToAdd = authorsData.map((a) => ({ mediaId, ...a }));
            await tx.insert(booksAuthors).values(authorsToAdd)
        }

        return mediaId;
    }

    async updateMediaWithDetails({ mediaData, authorsData, genresData }: UpdateBooksWithDetails) {
        const tx = getDbClient();

        const [media] = await tx
            .update(books)
            .set({
                ...mediaData,
                lastApiUpdate: sql`datetime('now')`,
            })
            .where(eq(books.apiId, mediaData.apiId))
            .returning({ id: books.id });

        const mediaId = media.id;

        if (authorsData && authorsData.length > 0) {
            await tx.delete(booksAuthors).where(eq(booksAuthors.mediaId, mediaId));
            const authorsToAdd = authorsData.map((a) => ({ mediaId, ...a }));
            await tx.insert(booksAuthors).values(authorsToAdd);
        }

        if (genresData && genresData.length > 0) {
            await tx.delete(booksGenre).where(eq(booksGenre.mediaId, mediaId));
            const genresToAdd = genresData.map((g) => ({ mediaId, ...g }));
            await tx.insert(booksGenre).values(genresToAdd);
        }

        return true;
    }

    async getListFilters(userId: number) {
        const { genres, tags } = await super.getCommonListFilters(userId);

        const langs = await getDbClient()
            .selectDistinct({ name: sql<string>`${books.language}` })
            .from(books)
            .innerJoin(booksList, eq(booksList.mediaId, books.id))
            .where(and(eq(booksList.userId, userId), isNotNull(books.language)));

        return { langs, genres, tags };
    }
}
