import {Status} from "@/lib/utils/enums";
import {getImageUrl} from "@/lib/server/core/images/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {AddedMediaDetails} from "@/lib/types/media-common.types";
import {createMediaQueries} from "@/lib/server/domain/media/base/media.queries";
import {and, eq, getTableColumns, gte, isNull, lte, or, sql} from "drizzle-orm";
import {movies, moviesActors, moviesGenre, moviesList} from "@/lib/server/database/schema";
import {UpdateMovieWithDetails, Movie, UpsertMovieWithDetails} from "@/lib/server/domain/media/movies/movies.types";
import {MovieServerDefinition, moviesServerDefinition} from "@/lib/media-definitions/movies/movies.definition.server";


export function createMoviesRepository(definition: MovieServerDefinition = moviesServerDefinition) {
    const { ingestion, attribution } = definition;
    const queries = createMediaQueries(definition);

    async function lockOldMovies() {
        const lockAfter = `-${ingestion.refresh.lockAfterMonths} months`;

        const [{ count }] = await getDbClient()
            .select({ count: sql<number>`count(*)` })
            .from(movies)
            .where(and(eq(movies.lockStatus, false), lte(movies.releaseDate, sql`date('now', ${lockAfter})`)));

        await getDbClient()
            .update(movies)
            .set({ lockStatus: true })
            .where(and(eq(movies.lockStatus, false), lte(movies.releaseDate, sql`date('now', ${lockAfter})`)));

        return count;
    }

    async function findByTitleAndYear(title: string, year: number) {
        return getDbClient()
            .select()
            .from(movies)
            .where(and(
                eq(movies.name, title),
                eq(sql`strftime('%Y', ${movies.releaseDate})`, String(year)),
            ))
            .get();
    }

    async function getMediaIdsToBeRefreshed() {
        const staleAfter = `-${ingestion.refresh.staleAfterDays} days`;
        const releaseGrace = `-${ingestion.refresh.releaseGraceMonths} months`;

        const results = await getDbClient()
            .select({ apiId: movies.apiId })
            .from(movies)
            .where(and(
                eq(movies.lockStatus, false),
                lte(movies.lastApiUpdate, sql`datetime('now', ${staleAfter})`),
                or(isNull(movies.releaseDate), gte(movies.releaseDate, sql`date('now', ${releaseGrace})`)),
            ));

        return results.map((r) => r.apiId);
    }

    function addMediaToUserList(userId: number, media: Movie, newStatus: Status) {
        const newTotal = (newStatus === Status.COMPLETED) ? 1 : 0;

        const [newMedia] = getDbClient()
            .insert(moviesList)
            .values({
                userId,
                total: newTotal,
                status: newStatus,
                mediaId: media.id,
            })
            .returning().all();

        return newMedia;
    }

    async function findAllAssociatedDetails(mediaId: number) {
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
                                'mediaCover', x.image_cover,
                                'releaseDate', x.release_date
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
                name: attribution.name,
                url: `${attribution.mediaUrl}${details.apiId}`,
            },
            actors: details.actors || [],
            genres: details.genres || [],
            collection: collection || [],
        };

        return result;
    }

    function storeMediaWithDetails({ mediaData, actorsData, genresData }: UpsertMovieWithDetails) {
        const tx = getDbClient();

        const [media] = tx
            .insert(movies)
            .values({
                ...mediaData,
                lastApiUpdate: sql`datetime('now')`,
            })
            .onConflictDoUpdate({
                target: movies.apiId,
                set: { lastApiUpdate: sql`datetime('now')` },
            })
            .returning().all();

        const mediaId = media.id;
        if (actorsData && actorsData.length > 0) {
            const actorsToAdd = actorsData.map((a) => ({ mediaId, ...a }));
            tx.insert(moviesActors).values(actorsToAdd).onConflictDoNothing().run();
        }

        if (genresData && genresData.length > 0) {
            const genresToAdd = genresData.map((g) => ({ mediaId, ...g }));
            tx.insert(moviesGenre).values(genresToAdd).onConflictDoNothing().run();
        }

        return mediaId;
    }

    function updateMediaWithDetails({ mediaData, actorsData, genresData }: UpdateMovieWithDetails) {
        const tx = getDbClient();

        const [media] = tx
            .update(movies)
            .set({
                ...mediaData,
                lastApiUpdate: sql`datetime('now')`,
            })
            .where(eq(movies.apiId, mediaData.apiId))
            .returning({ id: movies.id }).all();

        const mediaId = media.id;

        if (actorsData !== undefined) {
            tx
                .delete(moviesActors)
                .where(eq(moviesActors.mediaId, mediaId)).run();

            if (actorsData.length > 0) {
                tx
                    .insert(moviesActors)
                    .values(actorsData.map(actor => ({ mediaId, ...actor })))
                    .onConflictDoNothing().run();
            }
        }

        if (genresData !== undefined) {
            tx
                .delete(moviesGenre)
                .where(eq(moviesGenre.mediaId, mediaId)).run();

            if (genresData.length > 0) {
                tx
                    .insert(moviesGenre)
                    .values(genresData.map(genre => ({ mediaId, ...genre })))
                    .onConflictDoNothing().run();
            }
        }

        return true;
    }

    return {
        ...queries,
        lockOldMovies,
        findByTitleAndYear,
        getMediaIdsToBeRefreshed,
        addMediaToUserList,
        findAllAssociatedDetails,
        storeMediaWithDetails,
        updateMediaWithDetails,
    };
}


export type MoviesRepository = ReturnType<typeof createMoviesRepository>;
