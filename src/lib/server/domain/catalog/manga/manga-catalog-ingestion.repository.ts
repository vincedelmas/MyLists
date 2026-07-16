import {and, eq, inArray, sql} from "drizzle-orm";
import {getImageFilename} from "@/lib/utils/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {MediaIngestionRepository} from "@/lib/server/api-providers/interfaces.types";
import {UpsertMangaWithDetails} from "@/lib/server/domain/catalog/catalog-ingestion.types";
import {
    catalogGenre,
    catalogItem,
    catalogItemGenre,
    mangaAuthor,
    mangaDetails,
} from "@/lib/server/database/schema";
import {MediaType} from "@/lib/utils/enums";


/** Adapter from the retained Jikan transformer into the concrete manga catalog. */
export class MangaCatalogIngestionRepository implements MediaIngestionRepository<UpsertMangaWithDetails> {
    async findByApiId(apiId: number | string) {
        return getDbClient().select({ id: catalogItem.id, apiId: catalogItem.primaryExternalId })
            .from(catalogItem).where(and(
                eq(catalogItem.kind, MediaType.MANGA),
                eq(catalogItem.primaryProvider, "jikan"),
                eq(catalogItem.primaryExternalId, String(apiId)),
            )).get();
    }

    async findByApiIds(apiIds: (number | string)[]) {
        if (apiIds.length === 0) return [];
        return getDbClient().select({ id: catalogItem.id, apiId: catalogItem.primaryExternalId })
            .from(catalogItem).where(and(
                eq(catalogItem.kind, MediaType.MANGA),
                eq(catalogItem.primaryProvider, "jikan"),
                inArray(catalogItem.primaryExternalId, apiIds.map(String)),
            ));
    }

    async findByNames(names: string[]) {
        if (names.length === 0) return [];
        return getDbClient()
            .select({ id: catalogItem.id, name: catalogItem.name, releaseDate: catalogItem.releaseDate })
            .from(catalogItem)
            .where(and(
                eq(catalogItem.kind, MediaType.MANGA),
                inArray(sql<string>`lower(trim(${catalogItem.name}))`, names),
            ));
    }

    findForImport(catalogItemId: number) {
        return getDbClient()
            .select({ chapters: mangaDetails.chapters })
            .from(catalogItem)
            .innerJoin(mangaDetails, eq(mangaDetails.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.kind, MediaType.MANGA), eq(catalogItem.id, catalogItemId)))
            .get();
    }

    storeMediaWithDetails(details: UpsertMangaWithDetails) {
        return this.persist(details, "store");
    }

    async updateMediaWithDetails(details: UpsertMangaWithDetails) {
        if (!await this.findByApiId(details.mediaData.apiId)) return false;
        await this.persist(details, "refresh");
        return true;
    }

    private async persist(details: UpsertMangaWithDetails, mode: "store" | "refresh") {
        const media = details.mediaData;
        const apiId = String(media.apiId);
        const [item] = await getDbClient().insert(catalogItem).values({
            kind: MediaType.MANGA,
            primaryProvider: "jikan",
            primaryExternalId: apiId,
            name: media.name,
            releaseDate: media.releaseDate,
            synopsis: media.synopsis,
            imageCover: getImageFilename(media.imageCover),
            locked: media.lockStatus ?? false,
            lastProviderUpdate: sql`CURRENT_TIMESTAMP`,
        }).onConflictDoUpdate({
            target: [catalogItem.kind, catalogItem.primaryProvider, catalogItem.primaryExternalId],
            set: mode === "refresh" ? {
                name: media.name,
                releaseDate: media.releaseDate,
                synopsis: media.synopsis,
                imageCover: getImageFilename(media.imageCover),
                lastProviderUpdate: sql`CURRENT_TIMESTAMP`,
            } : { lastProviderUpdate: sql`CURRENT_TIMESTAMP` },
        }).returning({ id: catalogItem.id });

        await getDbClient().insert(mangaDetails).values({
            catalogItemId: item.id,
            originalName: media.originalName,
            chapters: media.chapters,
            productionStatus: media.prodStatus,
            siteUrl: media.siteUrl,
            endDate: media.endDate,
            volumes: media.volumes,
            voteAverage: media.voteAverage,
            voteCount: media.voteCount,
            popularity: media.popularity,
            publisher: media.publishers,
        }).onConflictDoUpdate({
            target: mangaDetails.catalogItemId,
            set: {
                originalName: media.originalName,
                chapters: media.chapters,
                productionStatus: media.prodStatus,
                siteUrl: media.siteUrl,
                endDate: media.endDate,
                volumes: media.volumes,
                voteAverage: media.voteAverage,
                voteCount: media.voteCount,
                popularity: media.popularity,
                publisher: media.publishers,
            },
        });

        await Promise.all([
            this.syncAuthors(item.id, details.authorsData, mode),
            this.syncGenres(item.id, details.genresData, mode),
        ]);
        return item.id;
    }

    private async syncAuthors(catalogItemId: number, rows: { name: string }[] | undefined, mode: "store" | "refresh") {
        const names = uniqueNames(rows);
        if (names.length === 0) return;
        if (mode === "refresh") await getDbClient().delete(mangaAuthor).where(eq(mangaAuthor.catalogItemId, catalogItemId));
        await getDbClient().insert(mangaAuthor)
            .values(names.map((name) => ({ catalogItemId, name }))).onConflictDoNothing();
    }

    private async syncGenres(catalogItemId: number, rows: { name: string }[] | undefined, mode: "store" | "refresh") {
        const names = uniqueNames(rows);
        if (names.length === 0) return;
        await getDbClient().insert(catalogGenre).values(names.map((name) => ({ name }))).onConflictDoNothing();
        const genres = await getDbClient().select().from(catalogGenre).where(inArray(catalogGenre.name, names));
        if (mode === "refresh") await getDbClient().delete(catalogItemGenre).where(eq(catalogItemGenre.catalogItemId, catalogItemId));
        await getDbClient().insert(catalogItemGenre)
            .values(genres.map(({ id }) => ({ catalogItemId, genreId: id }))).onConflictDoNothing();
    }
}


const uniqueNames = (rows?: { name: string }[]) => [...new Set((rows ?? []).map(({ name }) => name.trim()).filter(Boolean))];
