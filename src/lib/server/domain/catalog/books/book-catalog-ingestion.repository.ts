import {and, eq, inArray, sql} from "drizzle-orm";
import {getImageFilename} from "@/lib/utils/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {BookCatalogSnapshot} from "@/lib/server/domain/catalog/catalog-ingestion.types";
import {
    bookAuthor,
    bookDetails,
    catalogGenre,
    catalogItem,
    catalogItemGenre,
} from "@/lib/server/database/schema";
import {MediaType} from "@/lib/utils/enums";


/** Persists canonical Google Books snapshots into the book catalog tables. */
export class BookCatalogIngestionRepository {
    async findByApiId(apiId: number | string) {
        return getDbClient().select({ id: catalogItem.id, apiId: catalogItem.primaryExternalId })
            .from(catalogItem).where(and(
                eq(catalogItem.kind, MediaType.BOOKS),
                eq(catalogItem.primaryProvider, "google-books"),
                eq(catalogItem.primaryExternalId, String(apiId)),
            )).get();
    }

    async findByApiIds(apiIds: (number | string)[]) {
        if (apiIds.length === 0) return [];
        return getDbClient().select({ id: catalogItem.id, apiId: catalogItem.primaryExternalId })
            .from(catalogItem).where(and(
                eq(catalogItem.kind, MediaType.BOOKS),
                eq(catalogItem.primaryProvider, "google-books"),
                inArray(catalogItem.primaryExternalId, apiIds.map(String)),
            ));
    }

    async findByNames(names: string[]) {
        if (names.length === 0) return [];
        return getDbClient()
            .select({ id: catalogItem.id, name: catalogItem.name, releaseDate: catalogItem.releaseDate })
            .from(catalogItem)
            .where(and(
                eq(catalogItem.kind, MediaType.BOOKS),
                inArray(sql<string>`lower(trim(${catalogItem.name}))`, names),
            ));
    }

    findForImport(catalogItemId: number) {
        return getDbClient()
            .select({ pages: bookDetails.pages })
            .from(catalogItem)
            .innerJoin(bookDetails, eq(bookDetails.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.kind, MediaType.BOOKS), eq(catalogItem.id, catalogItemId)))
            .get();
    }

    insertSnapshot(details: BookCatalogSnapshot) {
        return this.persist(details, "store");
    }

    async replaceSnapshot(details: BookCatalogSnapshot) {
        if (!await this.findByApiId(details.apiId)) return false;
        await this.persist(details, "refresh");
        return true;
    }

    private async persist(details: BookCatalogSnapshot, mode: "store" | "refresh") {
        const media = details;
        const apiId = String(media.apiId);
        const [item] = await getDbClient().insert(catalogItem).values({
            kind: MediaType.BOOKS,
            primaryProvider: "google-books",
            primaryExternalId: apiId,
            name: media.name,
            releaseDate: media.releaseDate,
            synopsis: media.synopsis,
            imageCover: getImageFilename(media.imageCover),
            locked: media.locked ?? false,
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

        await getDbClient().insert(bookDetails).values({
            catalogItemId: item.id,
            pages: media.pages,
            language: media.language,
            publisher: media.publisher,
        }).onConflictDoUpdate({
            target: bookDetails.catalogItemId,
            set: {
                pages: media.pages,
                language: media.language,
                publisher: media.publisher,
            },
        });

        await Promise.all([
            this.syncAuthors(item.id, details.authors, mode),
            this.syncGenres(item.id, details.genres, mode),
        ]);
        return item.id;
    }

    private async syncAuthors(catalogItemId: number, rows: string[] | undefined, mode: "store" | "refresh") {
        const names = uniqueNames(rows);
        if (names.length === 0) return;
        if (mode === "refresh") await getDbClient().delete(bookAuthor).where(eq(bookAuthor.catalogItemId, catalogItemId));
        await getDbClient().insert(bookAuthor)
            .values(names.map((name, index) => ({ catalogItemId, name, position: index + 1 }))).onConflictDoNothing();
    }

    private async syncGenres(catalogItemId: number, rows: string[] | undefined, mode: "store" | "refresh") {
        const names = uniqueNames(rows);
        if (names.length === 0) return;
        await getDbClient().insert(catalogGenre).values(names.map((name) => ({ name }))).onConflictDoNothing();
        const genres = await getDbClient().select().from(catalogGenre).where(inArray(catalogGenre.name, names));
        if (mode === "refresh") await getDbClient().delete(catalogItemGenre).where(eq(catalogItemGenre.catalogItemId, catalogItemId));
        await getDbClient().insert(catalogItemGenre)
            .values(genres.map(({ id }) => ({ catalogItemId, genreId: id }))).onConflictDoNothing();
    }
}


const uniqueNames = (rows?: string[]) => [...new Set((rows ?? []).map((name) => name.trim()).filter(Boolean))];
