import {Status} from "@/lib/utils/enums";
import {getImageUrl} from "@/lib/utils/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {AddedMediaDetails} from "@/lib/types/media-common.types";
import {normalizeGamePlatforms} from "@/lib/utils/game-platforms";
import {BaseRepository} from "@/lib/server/domain/media/base/base.repository";
import {and, eq, getTableColumns, gte, isNull, lte, or, sql} from "drizzle-orm";
import {Game, UpsertGameWithDetails} from "@/lib/server/domain/media/games/games.types";
import {games, gamesCompanies, gamesGenre, gamesList, gamesPlatforms} from "@/lib/server/database/schema";
import {gamesServerDefinition, GamesServerDefinition} from "@/lib/media-definitions/games/games.definition.server";


export class GamesRepository extends BaseRepository<GamesServerDefinition> {
    constructor(definition: GamesServerDefinition = gamesServerDefinition) {
        super(definition);
    }

    async getMediaIdsToBeRefreshed() {
        const staleAfter = `-${this.ingestion.refresh.staleAfterDays} days`;

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

    // --- Implemented Methods ----------------------------------------------

    async addMediaToUserList(userId: number, media: Game, newStatus: Status) {
        const [newMedia] = await getDbClient()
            .insert(gamesList)
            .values({
                userId,
                mediaId: media.id,
                status: newStatus,
                playtime: 0,
            })
            .returning();

        return newMedia;
    }

    async getCompatiblePlatforms(mediaId: number) {
        // Get IGDB platforms names and then normalize then considering my GameEnum

        const igdbPlatforms = await getDbClient()
            .select({ name: gamesPlatforms.name })
            .from(gamesPlatforms)
            .where(eq(gamesPlatforms.mediaId, mediaId));

        return normalizeGamePlatforms(igdbPlatforms);
    }

    async findAllAssociatedDetails(mediaId: number) {
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
                                'mediaCover', x.image_cover
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
                name: this.attribution.name,
                url: details.igdbUrl ?? "#",
            },
            genres: details.genres || [],
            collection: collection || [],
            companies: details.companies || [],
            platforms: details.platforms || [],
        };

        return result;
    }

    async storeMediaWithDetails({ mediaData, companiesData, platformsData, genresData }: UpsertGameWithDetails) {
        const tx = getDbClient();

        const [media] = await tx
            .insert(games)
            .values({
                ...mediaData,
                lastApiUpdate: sql`datetime('now')`,
            })
            .onConflictDoUpdate({
                target: games.apiId,
                set: { lastApiUpdate: sql`datetime('now')` },
            })
            .returning();

        const mediaId = media.id;
        if (companiesData && companiesData.length > 0) {
            const companiesToAdd = companiesData.map(comp => ({ mediaId, ...comp }));
            await tx.insert(gamesCompanies).values(companiesToAdd).onConflictDoNothing();
        }
        if (platformsData && platformsData.length > 0) {
            const platformsToAdd = platformsData.map(plt => ({ mediaId, ...plt }));
            await tx.insert(gamesPlatforms).values(platformsToAdd).onConflictDoNothing();
        }
        if (genresData && genresData.length > 0) {
            const genresToAdd = genresData.map(g => ({ mediaId, ...g }));
            await tx.insert(gamesGenre).values(genresToAdd).onConflictDoNothing();
        }

        return mediaId;
    }

    async updateMediaWithDetails({ mediaData, companiesData, platformsData, genresData }: UpsertGameWithDetails) {
        const tx = getDbClient();

        const [media] = await tx
            .update(games)
            .set({
                ...mediaData,
                lastApiUpdate: sql`datetime('now')`,
            })
            .where(eq(games.apiId, mediaData.apiId))
            .returning({ id: games.id })

        const mediaId = media.id;
        if (companiesData !== undefined) {
            await tx
                .delete(gamesCompanies)
                .where(eq(gamesCompanies.mediaId, mediaId));

            if (companiesData.length > 0) {
                await tx
                    .insert(gamesCompanies)
                    .values(companiesData.map(comp => ({ mediaId, ...comp })))
                    .onConflictDoNothing();
            }
        }
        if (platformsData !== undefined) {
            await tx
                .delete(gamesPlatforms)
                .where(eq(gamesPlatforms.mediaId, mediaId));

            if (platformsData.length > 0) {
                await tx
                    .insert(gamesPlatforms)
                    .values(platformsData.map(plt => ({ mediaId, ...plt })))
                    .onConflictDoNothing();
            }
        }
        if (genresData !== undefined) {
            await tx
                .delete(gamesGenre)
                .where(eq(gamesGenre.mediaId, mediaId));

            if (genresData.length > 0) {
                await tx
                    .insert(gamesGenre)
                    .values(genresData.map(genre => ({ mediaId, ...genre })))
                    .onConflictDoNothing();
            }
        }

        return true;
    }
}
