import {Status} from "@/lib/utils/enums";
import {getImageUrl} from "@/lib/server/core/images/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {AddedMediaDetails} from "@/lib/types/media-common.types";
import {normalizeGamePlatforms} from "@/lib/server/domain/media/games/platforms";
import {createMediaQueries} from "@/lib/server/domain/media/base/media.queries";
import {and, eq, getTableColumns, gte, isNull, lte, or, sql} from "drizzle-orm";
import {games, gamesCompanies, gamesGenre, gamesList, gamesPlatforms} from "@/lib/server/database/schema";
import {Game, UpdateGameWithDetails, UpsertGameWithDetails} from "@/lib/server/domain/media/games/games.types";
import {gamesServerDefinition, GamesServerDefinition} from "@/lib/media-definitions/games/games.definition.server";


export function createGamesRepository(definition: GamesServerDefinition = gamesServerDefinition) {
    const { ingestion, attribution } = definition;
    const queries = createMediaQueries(definition);

    async function getMediaIdsToBeRefreshed() {
        const staleAfter = `-${ingestion.refresh.staleAfterDays} days`;

        return getDbClient()
            .select({ apiId: games.apiId })
            .from(games)
            .where(and(
                eq(games.lockStatus, false),
                lte(games.lastApiUpdate, sql`datetime('now', ${staleAfter})`),
                or(isNull(games.releaseDate), gte(games.releaseDate, sql`date('now')`)),
            ))
            .then((res) => res.map((r) => r.apiId));
    }

    function addMediaToUserList(userId: number, media: Game, newStatus: Status) {
        const [newMedia] = getDbClient()
            .insert(gamesList)
            .values({
                userId,
                mediaId: media.id,
                status: newStatus,
                playtime: 0,
            })
            .returning().all();

        return newMedia;
    }

    async function getCompatiblePlatforms(mediaId: number) {
        // Get IGDB platforms names and normalize then considering my GameEnum

        const igdbPlatforms = await getDbClient()
            .select({ name: gamesPlatforms.name })
            .from(gamesPlatforms)
            .where(eq(gamesPlatforms.mediaId, mediaId));

        return normalizeGamePlatforms(igdbPlatforms);
    }

    async function findAllAssociatedDetails(mediaId: number) {
        const details = getDbClient()
            .select({
                ...getTableColumns(games),
                genres: sql`json_group_array(DISTINCT json_object('id', ${gamesGenre.id}, 'name', ${gamesGenre.name}))`.mapWith(JSON.parse),
                companies: sql`json_group_array(DISTINCT json_object('id', ${gamesCompanies.id}, 'name', ${gamesCompanies.name}, 'developer', ${gamesCompanies.developer}, 'publisher', ${gamesCompanies.publisher}))`.mapWith(JSON.parse),
                platforms: sql`json_group_array(DISTINCT json_object('id', ${gamesPlatforms.id}, 'name', ${gamesPlatforms.name}))`.mapWith(JSON.parse),
                collection: sql`
                    CASE 
                        WHEN ${games.collectionId} IS NULL 
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
                                    g2.id,
                                    g2.name,
                                    g2.image_cover,
                                    g2.release_date
                                FROM games g2
                                WHERE g2.collection_id = ${games.collectionId} AND g2.id != ${games.id}
                                ORDER BY g2.release_date ASC, g2.id ASC
                            ) AS x
                        )
                    END
                `.mapWith(JSON.parse),
            })
            .from(games)
            .leftJoin(gamesCompanies, eq(gamesCompanies.mediaId, games.id))
            .leftJoin(gamesPlatforms, eq(gamesPlatforms.mediaId, games.id))
            .leftJoin(gamesGenre, eq(gamesGenre.mediaId, games.id))
            .where(eq(games.id, mediaId))
            .groupBy(...Object.values(getTableColumns(games)))
            .get();

        if (!details) return;

        const collection = details.collection.map((item: { mediaId: number, mediaName: string, mediaCover: string }) => ({
            ...item,
            mediaCover: getImageUrl("games-covers", item.mediaCover),
        }));

        const result: Game & AddedMediaDetails = {
            ...details,
            providerData: {
                name: attribution.name,
                url: details.igdbUrl ?? "#",
            },
            genres: details.genres || [],
            collection: collection || [],
            companies: details.companies || [],
            platforms: details.platforms || [],
        };

        return result;
    }

    function storeMediaWithDetails({ mediaData, companiesData, platformsData, genresData }: UpsertGameWithDetails) {
        const tx = getDbClient();

        const [media] = tx
            .insert(games)
            .values({
                ...mediaData,
                lastApiUpdate: sql`datetime('now')`,
            })
            .onConflictDoUpdate({
                target: games.apiId,
                set: { lastApiUpdate: sql`datetime('now')` },
            })
            .returning().all();

        const mediaId = media.id;
        if (companiesData && companiesData.length > 0) {
            const companiesToAdd = companiesData.map(comp => ({ mediaId, ...comp }));
            tx.insert(gamesCompanies).values(companiesToAdd).onConflictDoNothing().run();
        }
        if (platformsData && platformsData.length > 0) {
            const platformsToAdd = platformsData.map(plt => ({ mediaId, ...plt }));
            tx.insert(gamesPlatforms).values(platformsToAdd).onConflictDoNothing().run();
        }
        if (genresData && genresData.length > 0) {
            const genresToAdd = genresData.map(g => ({ mediaId, ...g }));
            tx.insert(gamesGenre).values(genresToAdd).onConflictDoNothing().run();
        }

        return mediaId;
    }

    function updateMediaWithDetails({ mediaData, companiesData, platformsData, genresData }: UpdateGameWithDetails) {
        const tx = getDbClient();

        const [media] = tx
            .update(games)
            .set({
                ...mediaData,
                lastApiUpdate: sql`datetime('now')`,
            })
            .where(eq(games.apiId, mediaData.apiId))
            .returning({ id: games.id }).all()

        const mediaId = media.id;
        if (companiesData !== undefined) {
            tx
                .delete(gamesCompanies)
                .where(eq(gamesCompanies.mediaId, mediaId)).run();

            if (companiesData.length > 0) {
                tx
                    .insert(gamesCompanies)
                    .values(companiesData.map(comp => ({ mediaId, ...comp })))
                    .onConflictDoNothing().run();
            }
        }
        if (platformsData !== undefined) {
            tx
                .delete(gamesPlatforms)
                .where(eq(gamesPlatforms.mediaId, mediaId)).run();

            if (platformsData.length > 0) {
                tx
                    .insert(gamesPlatforms)
                    .values(platformsData.map(plt => ({ mediaId, ...plt })))
                    .onConflictDoNothing().run();
            }
        }
        if (genresData !== undefined) {
            tx
                .delete(gamesGenre)
                .where(eq(gamesGenre.mediaId, mediaId)).run();

            if (genresData.length > 0) {
                tx
                    .insert(gamesGenre)
                    .values(genresData.map(genre => ({ mediaId, ...genre })))
                    .onConflictDoNothing().run();
            }
        }

        return true;
    }

    return {
        ...queries,
        getMediaIdsToBeRefreshed,
        addMediaToUserList,
        getCompatiblePlatforms,
        findAllAssociatedDetails,
        storeMediaWithDetails,
        updateMediaWithDetails,
    };
}


export type GamesRepository = ReturnType<typeof createGamesRepository>;
