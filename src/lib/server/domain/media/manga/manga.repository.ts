import {Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {AddedMediaDetails} from "@/lib/types/media-common.types";
import {BaseRepository} from "@/lib/server/domain/media/base/base.repository";
import {manga, mangaAuthors, mangaGenre, mangaList} from "@/lib/server/database/schema";
import {and, eq, getTableColumns, gte, inArray, isNull, lte, or, sql} from "drizzle-orm";
import {Manga, UpsertMangaWithDetails} from "@/lib/server/domain/media/manga/manga.types";
import {mangaServerDefinition, MangaServerDefinition} from "@/lib/media-definitions/manga/manga.definition.server";


export class MangaRepository extends BaseRepository<MangaServerDefinition> {
    constructor(definition: MangaServerDefinition = mangaServerDefinition) {
        super(definition);
    }

    async getMediaIdsToBeRefreshed() {
        const staleAfter = `-${this.ingestion.refresh.staleAfterDays} days`;
        const activeProdStatuses = [...this.ingestion.refresh.activeProdStatuses];

        const results = await getDbClient()
            .select({ apiId: manga.apiId })
            .from(manga)
            .where(and(
                eq(manga.lockStatus, false),
                lte(manga.lastApiUpdate, sql`datetime('now', ${staleAfter})`),
                or(
                    isNull(manga.releaseDate),
                    gte(manga.releaseDate, sql`date('now')`),
                    inArray(manga.prodStatus, activeProdStatuses),
                ),
            ));

        return results.map((r) => r.apiId);
    }

    // --- Implemented Methods ------------------------------------------------

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
        const details = getDbClient()
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
                name: this.attribution.name,
                url: `${this.attribution.mediaUrl}${details.apiId}`,
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
            }).onConflictDoUpdate({
                target: manga.apiId,
                set: { lastApiUpdate: sql`datetime('now')` },
            }).returning();

        const mediaId = media.id;
        if (authorsData && authorsData.length > 0) {
            await tx
                .insert(mangaAuthors)
                .values(authorsData.map(author => ({ mediaId, ...author })))
                .onConflictDoNothing();
        }

        if (genresData && genresData.length > 0) {
            await tx
                .insert(mangaGenre)
                .values(genresData.map(genre => ({ mediaId, ...genre })))
                .onConflictDoNothing();
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

        if (authorsData !== undefined) {
            await tx
                .delete(mangaAuthors)
                .where(eq(mangaAuthors.mediaId, mediaId));

            if (authorsData.length > 0) {
                await tx
                    .insert(mangaAuthors)
                    .values(authorsData.map(author => ({ mediaId, ...author })))
                    .onConflictDoNothing();
            }
        }

        if (genresData !== undefined) {
            await tx
                .delete(mangaGenre)
                .where(eq(mangaGenre.mediaId, mediaId));

            if (genresData.length > 0) {
                await tx
                    .insert(mangaGenre)
                    .values(genresData.map(genre => ({ mediaId, ...genre })))
                    .onConflictDoNothing();
            }
        }

        return true;
    }
}
