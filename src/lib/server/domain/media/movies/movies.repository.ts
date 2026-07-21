import {Status} from "@/lib/utils/enums";
import {getImageUrl} from "@/lib/utils/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {AddedMediaDetails} from "@/lib/types/media-common.types";
import {BaseRepository} from "@/lib/server/domain/media/base/base.repository";
import type {ProviderAttribution} from "@/lib/server/domain/media/base/media-definition";
import {movies, moviesActors, moviesGenre, moviesList} from "@/lib/server/database/schema";
import {Movie, UpsertMovieWithDetails} from "@/lib/server/domain/media/movies/movies.types";
import {and, asc, eq, getTableColumns, gte, isNotNull, isNull, lte, ne, or, sql} from "drizzle-orm";
import {type MovieRepositoryDefinition, moviesDefinition} from "@/lib/server/domain/media/movies/movies.definition";


export class MoviesRepository extends BaseRepository<MovieRepositoryDefinition> {
    constructor(
        definition: MovieRepositoryDefinition = moviesDefinition.repository,
        private readonly attribution: ProviderAttribution = moviesDefinition.attribution,
    ) {
        super(definition);
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

    // --- Implemented Methods ------------------------------------------------

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
                name: this.attribution.name,
                url: `${this.attribution.mediaUrl}${details.apiId}`,
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

        if (actorsData !== undefined) {
            await tx
                .delete(moviesActors)
                .where(eq(moviesActors.mediaId, mediaId));

            if (actorsData.length > 0) {
                await tx
                    .insert(moviesActors)
                    .values(actorsData.map(author => ({ mediaId, ...author })));
            }
        }

        if (genresData !== undefined) {
            await tx
                .delete(moviesGenre)
                .where(eq(moviesGenre.mediaId, mediaId));

            if (genresData.length > 0) {
                await tx
                    .insert(moviesGenre)
                    .values(genresData.map(genre => ({ mediaId, ...genre })));
            }
        }

        return true;
    }
}
