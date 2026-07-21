import {Status} from "@/lib/utils/enums";
import {getImageUrl} from "@/lib/utils/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {AddedMediaDetails} from "@/lib/types/media-common.types";
import {normalizeGamePlatforms} from "@/lib/utils/game-platforms";
import {BaseRepository} from "@/lib/server/domain/media/base/base.repository";
import {ProviderAttribution} from "@/lib/server/domain/media/base/media-definition";
import {Game, UpsertGameWithDetails} from "@/lib/server/domain/media/games/games.types";
import {gamesDefinition, GamesDefinition} from "@/lib/server/domain/media/games/games.definition";
import {games, gamesCompanies, gamesGenre, gamesList, gamesPlatforms} from "@/lib/server/database/schema";
import {and, asc, count, eq, getTableColumns, gte, isNotNull, isNull, lte, ne, or, sql} from "drizzle-orm";


export class GamesRepository extends BaseRepository<GamesDefinition> {
    private readonly attribution: ProviderAttribution;

    constructor(definition: GamesDefinition = gamesDefinition) {
        super(definition);
        this.attribution = definition.attribution;
    }

    async getMediaIdsToBeRefreshed() {
        return getDbClient()
            .select({ apiId: games.apiId })
            .from(games)
            .where(and(
                eq(games.lockStatus, false),
                lte(games.lastApiUpdate, sql`datetime('now', '-2 days')`),
                or(isNull(games.releaseDate), gte(games.releaseDate, sql`date('now')`)),
            ))
            .then((res) => res.map((r) => r.apiId));
    }

    // --- Advanced Stats  --------------------------------------------------

    async gameAvgPlaytime(userId?: number) {
        const forUser = userId ? eq(gamesList.userId, userId) : undefined;

        const avgDuration = getDbClient()
            .select({
                average: sql<number | null>`avg(${gamesList.playtime} / 60)`.as("avg_playtime")
            })
            .from(gamesList)
            .where(and(forUser, ne(gamesList.status, Status.PLAN_TO_PLAY), isNotNull(gamesList.playtime)))
            .get();

        return avgDuration?.average ?? null;
    }

    async gamePlaytimeDistrib(userId?: number) {
        const forUser = userId ? eq(gamesList.userId, userId) : undefined;

        const playtimeHoursLog = sql<number>`floor(log(max(${gamesList.playtime} / 60, 1)) / log(2))`;

        const playtimeDistrib = await getDbClient()
            .select({
                name: playtimeHoursLog,
                value: count(games.id).as("count"),
            })
            .from(games)
            .innerJoin(gamesList, eq(gamesList.mediaId, games.id))
            .where(and(forUser, ne(gamesList.status, Status.PLAN_TO_PLAY), isNotNull(gamesList.playtime)))
            .groupBy(playtimeHoursLog)
            .orderBy(asc(playtimeHoursLog));

        return playtimeDistrib.map((p) => ({ name: String(Math.pow(2, p.name)), value: p.value }));
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
            const companiesToAdd = companiesData.map((comp) => ({ mediaId, ...comp }));
            await tx.insert(gamesCompanies).values(companiesToAdd);
        }
        if (platformsData && platformsData.length > 0) {
            const platformsToAdd = platformsData.map((plt) => ({ mediaId, ...plt }));
            await tx.insert(gamesPlatforms).values(platformsToAdd);
        }
        if (genresData && genresData.length > 0) {
            const genresToAdd = genresData.map((g) => ({ mediaId, ...g }));
            await tx.insert(gamesGenre).values(genresToAdd);
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
                    .values(companiesData.map(comp => ({ mediaId, ...comp })));
            }
        }
        if (platformsData !== undefined) {
            await tx
                .delete(gamesPlatforms)
                .where(eq(gamesPlatforms.mediaId, mediaId));

            if (platformsData.length > 0) {
                await tx
                    .insert(gamesPlatforms)
                    .values(platformsData.map(plt => ({ mediaId, ...plt })));
            }
        }
        if (genresData !== undefined) {
            await tx
                .delete(gamesGenre)
                .where(eq(gamesGenre.mediaId, mediaId));

            if (genresData.length > 0) {
                await tx
                    .insert(gamesGenre)
                    .values(genresData.map(genre => ({ mediaId, ...genre })));
            }
        }

        return true;
    }
}
