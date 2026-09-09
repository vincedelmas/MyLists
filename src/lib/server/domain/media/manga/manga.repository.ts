import {Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {AddedMediaDetails} from "@/lib/types/media-common.types";
import {createMediaQueries} from "@/lib/server/domain/media/base/media.queries";
import {manga, mangaAuthors, mangaGenre, mangaList} from "@/lib/server/database/schema";
import {and, eq, getTableColumns, gte, inArray, isNull, lte, or, sql} from "drizzle-orm";
import {UpdateMangaWithDetails, Manga, UpsertMangaWithDetails} from "@/lib/server/domain/media/manga/manga.types";
import {mangaServerDefinition, MangaServerDefinition} from "@/lib/media-definitions/manga/manga.definition.server";


export function createMangaRepository(definition: MangaServerDefinition = mangaServerDefinition) {
    const { ingestion, attribution } = definition;
    const queries = createMediaQueries(definition);

    async function getMediaIdsToBeRefreshed() {
        const staleAfter = `-${ingestion.refresh.staleAfterDays} days`;
        const activeProdStatuses = [...ingestion.refresh.activeProdStatuses];

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

    function addMediaToUserList(userId: number, media: Manga, newStatus: Status) {
        const newTotal = (newStatus === Status.COMPLETED) ? (media.chapters ?? 0) : 0;

        const [newMedia] = getDbClient()
            .insert(mangaList)
            .values({
                userId: userId,
                total: newTotal,
                status: newStatus,
                mediaId: media.id,
                currentChapter: newTotal,
            })
            .returning().all();

        return newMedia;
    }

    async function findAllAssociatedDetails(mediaId: number) {
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
                name: attribution.name,
                url: `${attribution.mediaUrl}${details.apiId}`,
            },
            genres: details.genres || [],
            authors: details.authors || [],
        };

        return result;
    }

    function storeMediaWithDetails({ mediaData, authorsData, genresData }: UpsertMangaWithDetails) {
        const tx = getDbClient();

        const [media] = tx
            .insert(manga)
            .values({
                ...mediaData,
                lastApiUpdate: sql`datetime('now')`,
            }).onConflictDoUpdate({
                target: manga.apiId,
                set: { lastApiUpdate: sql`datetime('now')` },
            }).returning().all();

        const mediaId = media.id;
        if (authorsData && authorsData.length > 0) {
            tx
                .insert(mangaAuthors)
                .values(authorsData.map(author => ({ mediaId, ...author })))
                .onConflictDoNothing().run();
        }

        if (genresData && genresData.length > 0) {
            tx
                .insert(mangaGenre)
                .values(genresData.map(genre => ({ mediaId, ...genre })))
                .onConflictDoNothing().run();
        }

        return mediaId;
    }

    function updateMediaWithDetails({ mediaData, authorsData, genresData }: UpdateMangaWithDetails) {
        const tx = getDbClient();

        const [media] = tx
            .update(manga)
            .set({
                ...mediaData,
                lastApiUpdate: sql`datetime('now')`,
            })
            .where(eq(manga.apiId, mediaData.apiId))
            .returning({ id: manga.id }).all();

        const mediaId = media.id;

        if (authorsData !== undefined) {
            tx
                .delete(mangaAuthors)
                .where(eq(mangaAuthors.mediaId, mediaId)).run();

            if (authorsData.length > 0) {
                tx
                    .insert(mangaAuthors)
                    .values(authorsData.map(author => ({ mediaId, ...author })))
                    .onConflictDoNothing().run();
            }
        }

        if (genresData !== undefined) {
            tx
                .delete(mangaGenre)
                .where(eq(mangaGenre.mediaId, mediaId)).run();

            if (genresData.length > 0) {
                tx
                    .insert(mangaGenre)
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
        findAllAssociatedDetails,
        storeMediaWithDetails,
        updateMediaWithDetails,
    };
}


export type MangaRepository = ReturnType<typeof createMangaRepository>;
