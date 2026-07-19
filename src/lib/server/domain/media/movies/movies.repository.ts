import {Status} from "@/lib/utils/enums";
import {getImageUrl} from "@/lib/utils/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {AddedMediaDetails} from "@/lib/types/media-common.types";
import {BaseRepository} from "@/lib/server/domain/media/base/base.repository";
import {movies, moviesActors, moviesGenre, moviesList} from "@/lib/server/database/schema";
import {Movie, UpsertMovieWithDetails} from "@/lib/server/domain/media/movies/movies.types";
import {MovieSchemaConfig, moviesConfig} from "@/lib/server/domain/media/movies/movies.config";
import {and, asc, eq, getTableColumns, gte, isNotNull, isNull, lte, ne, or, sql} from "drizzle-orm";


export class MoviesRepository extends BaseRepository<MovieSchemaConfig> {
    config: MovieSchemaConfig;

    constructor() {
        super(moviesConfig);
        this.config = moviesConfig;
    }

    async lockOldMovies() {
        const [{ count }] = await getDbClient()
            .select({ count: sql<number>`count(*)` })
            .from(movies)
            .where(and(eq(movies.lockStatus, false), lte(movies.releaseDate, sql`date('now', '-6 months')`)));

        await getDbClient()
            .update(movies)
            .set({ lockStatus: true })
            .where(and(eq(movies.lockStatus, false), lte(movies.releaseDate, sql`date('now', '-6 months')`)));

        return count;
    }

    async findByTitleAndYear(title: string, year: number) {
        return getDbClient()
            .select()
            .from(movies)
            .where(and(
                eq(movies.name, title),
                eq(sql`strftime('%Y', ${movies.releaseDate})`, String(year)),
            ))
            .get();
    }

    async getMediaIdsToBeRefreshed() {
        const results = await getDbClient()
            .select({ apiId: movies.apiId })
            .from(movies)
            .where(and(
                eq(movies.lockStatus, false),
                lte(movies.lastApiUpdate, sql`datetime('now', '-2 days')`),
                or(isNull(movies.releaseDate), gte(movies.releaseDate, sql`date('now', '-6 months')`)),
            ));

        return results.map((r) => r.apiId);
    }

    // --- Advanced Stats  --------------------------------------------------

    async avgMovieDuration(userId?: number) {
        const forUser = userId ? eq(moviesList.userId, userId) : undefined;

        const avgDuration = getDbClient()
            .select({
                average: sql<number | null>`avg(${movies.duration})`,
            })
            .from(movies)
            .innerJoin(moviesList, eq(moviesList.mediaId, movies.id))
            .where(and(forUser, ne(moviesList.status, Status.PLAN_TO_WATCH), isNotNull(movies.duration)))
            .get();

        return avgDuration?.average ?? null;
    }

    async movieDurationDistrib(userId?: number) {
        const forUser = userId ? eq(moviesList.userId, userId) : undefined;

        return getDbClient()
            .select({
                name: sql`floor(${movies.duration} / 30.0) * 30`.mapWith(String),
                value: sql`cast(count(${movies.id}) as int)`.mapWith(Number).as("count"),
            })
            .from(movies)
            .innerJoin(moviesList, eq(moviesList.mediaId, movies.id))
            .where(and(forUser, ne(moviesList.status, Status.PLAN_TO_WATCH), isNotNull(movies.duration)))
            .groupBy(sql<number>`floor(${movies.duration} / 30.0) * 30`)
            .orderBy(asc(sql<number>`floor(${movies.duration} / 30.0) * 30`));
    }

    async budgetRevenueStats(userId?: number) {
        const forUser = userId ? eq(moviesList.userId, userId) : undefined;

        const data = getDbClient()
            .select({
                totalBudget: sql<number>`coalesce(sum(${movies.budget}), 0)`.as("total_budget"),
                totalRevenue: sql<number>`coalesce(sum(${movies.revenue}), 0)`.as("total_revenue"),
            })
            .from(movies)
            .innerJoin(moviesList, eq(moviesList.mediaId, movies.id))
            .where(and(forUser, ne(moviesList.status, Status.PLAN_TO_WATCH)))
            .get();

        return { totalBudget: data?.totalBudget ?? 0, totalRevenue: data?.totalRevenue ?? 0 };
    }

    async specificTopMetrics(mediaAvgRating: number | null, userId?: number) {
        const langsConfig = {
            metricTable: movies,
            metricIdCol: movies.id,
            mediaLinkCol: moviesList.mediaId,
            metricNameCol: movies.originalLanguage,
            filters: [ne(moviesList.status, Status.PLAN_TO_WATCH)],
        };
        const directorsConfig = {
            metricTable: movies,
            metricIdCol: movies.id,
            mediaLinkCol: moviesList.mediaId,
            metricNameCol: movies.directorName,
            filters: [ne(moviesList.status, Status.PLAN_TO_WATCH)],
        };
        const actorsConfig = {
            metricTable: moviesActors,
            metricNameCol: moviesActors.name,
            mediaLinkCol: moviesList.mediaId,
            metricIdCol: moviesActors.mediaId,
            filters: [ne(moviesList.status, Status.PLAN_TO_WATCH)],
        };

        const langsStats = await this.computeTopAffinityStats(langsConfig, mediaAvgRating, userId);
        const actorsStats = await this.computeTopAffinityStats(actorsConfig, mediaAvgRating, userId);
        const directorsStats = await this.computeTopAffinityStats(directorsConfig, mediaAvgRating, userId);

        return { directorsStats, actorsStats, langsStats };
    }

    // --- Implemented Methods ------------------------------------------------

    async computeAllUsersStats() {
        const timeSpentStat = sql<number>`
            COALESCE(SUM(
                CASE 
                    WHEN ${moviesList.status} = ${Status.COMPLETED} THEN (1 + ${moviesList.redo}) * ${movies.duration}
                    ELSE 0
                END
            ), 0)
        `
        const totalSpecificStat = sql<number>`
            COALESCE(SUM(
                CASE 
                    WHEN ${moviesList.status} = ${Status.COMPLETED} THEN 1 + ${moviesList.redo}
                    ELSE 0
                END
            ), 0)
        `

        return this._computeAllUsersStats(timeSpentStat, totalSpecificStat)
    }

    async addMediaToUserList(userId: number, media: Movie, newStatus: Status) {
        const newTotal = (newStatus === Status.COMPLETED) ? 1 : 0;

        const [newMedia] = await getDbClient()
            .insert(moviesList)
            .values({
                userId,
                total: newTotal,
                status: newStatus,
                mediaId: media.id,
            })
            .returning();

        return newMedia;
    }

    async findAllAssociatedDetails(mediaId: number) {
        const { apiProvider } = this.config;

        const details = getDbClient()
            .select({
                ...getTableColumns(movies),
                genres: sql`json_group_array(DISTINCT json_object('id', ${moviesGenre.id}, 'name', ${moviesGenre.name}))`.mapWith(JSON.parse),
                actors: sql`json_group_array(DISTINCT json_object('id', ${moviesActors.id}, 'name', ${moviesActors.name}))`.mapWith(JSON.parse),
                collection: sql`
                    CASE 
                        WHEN ${movies.collectionId} IS NULL 
                        THEN json_array()
                        ELSE (
                            SELECT COALESCE(json_group_array(json_object(
                                'mediaId', x.id, 
                                'mediaName', x.name, 
                                'mediaCover', x.image_cover
                            )), json_array())
                            FROM (
                                SELECT
                                    m2.id,
                                    m2.name,
                                    m2.image_cover,
                                    m2.release_date
                                FROM movies m2
                                WHERE m2.collection_id = ${movies.collectionId} AND m2.id != ${movies.id}
                                ORDER BY m2.release_date ASC, m2.id ASC
                            ) AS x
                        )
                    END
                `.mapWith(JSON.parse),
            }).from(movies)
            .leftJoin(moviesActors, eq(moviesActors.mediaId, movies.id))
            .leftJoin(moviesGenre, eq(moviesGenre.mediaId, movies.id))
            .where(eq(movies.id, mediaId))
            .groupBy(...Object.values(getTableColumns(movies)))
            .get();

        if (!details) return;

        const collection = details.collection.map((item: { mediaId: number, mediaName: string, mediaCover: string }) => ({
            ...item,
            mediaCover: getImageUrl("movies-covers", item.mediaCover),
        }));

        const result: Movie & AddedMediaDetails = {
            ...details,
            providerData: {
                name: apiProvider.name,
                url: `${apiProvider.mediaUrl}${details.apiId}`,
            },
            actors: details.actors || [],
            genres: details.genres || [],
            collection: collection || [],
        };

        return result;
    }

    async storeMediaWithDetails({ mediaData, actorsData, genresData }: UpsertMovieWithDetails) {
        const tx = getDbClient();

        const [media] = await tx
            .insert(movies)
            .values({
                ...mediaData,
                lastApiUpdate: sql`datetime('now')`,
            })
            .onConflictDoUpdate({
                target: movies.apiId,
                set: { lastApiUpdate: sql`datetime('now')` },
            })
            .returning();

        const mediaId = media.id;
        if (actorsData && actorsData.length > 0) {
            const actorsToAdd = actorsData.map((a) => ({ mediaId, ...a }));
            await tx.insert(moviesActors).values(actorsToAdd)
        }

        if (genresData && genresData.length > 0) {
            const genresToAdd = genresData.map((g) => ({ mediaId, ...g }));
            await tx.insert(moviesGenre).values(genresToAdd)
        }

        return mediaId;
    }

    async updateMediaWithDetails({ mediaData, actorsData, genresData }: UpsertMovieWithDetails) {
        const tx = getDbClient();

        const [media] = await tx
            .update(movies)
            .set({
                ...mediaData,
                lastApiUpdate: sql`datetime('now')`,
            })
            .where(eq(movies.apiId, mediaData.apiId))
            .returning({ id: movies.id });

        const mediaId = media.id;

        if (actorsData && actorsData.length > 0) {
            await tx.delete(moviesActors).where(eq(moviesActors.mediaId, mediaId));
            const actorsToAdd = actorsData.map((a) => ({ mediaId, ...a }));
            await tx.insert(moviesActors).values(actorsToAdd);
        }

        if (genresData && genresData.length > 0) {
            await tx.delete(moviesGenre).where(eq(moviesGenre.mediaId, mediaId));
            const genresToAdd = genresData.map((g) => ({ mediaId, ...g }));
            await tx.insert(moviesGenre).values(genresToAdd);
        }

        return true;
    }

    async getListFilters(userId: number) {
        const { genres, tags } = await super.getCommonListFilters(userId);

        const langs = await getDbClient()
            .selectDistinct({ name: sql<string>`${movies.originalLanguage}` })
            .from(movies)
            .innerJoin(moviesList, eq(moviesList.mediaId, movies.id))
            .where(and(eq(moviesList.userId, userId), isNotNull(movies.originalLanguage)));

        return { langs, genres, tags };
    }
}
