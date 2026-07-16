import {MediaType} from "@/lib/utils/enums";
import {getImageFilename} from "@/lib/utils/image-url";
import {and, asc, eq, inArray, isNull, sql} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {hasDefinedCatalogFields} from "@/lib/server/domain/catalog/catalog-admin-fields";
import {bookAuthor, bookDetails, catalogGenre, catalogItem, catalogItemGenre,} from "@/lib/server/database/schema";


export type BookCatalogEdit = Partial<{
    name: string;
    pages: number;
    authors: string[];
    imageCover: string;
    lockStatus: boolean;
    synopsis: string | null;
    language: string | null;
    publishers: string | null;
    releaseDate: string | null;
}>;


export class BookCatalogAdminRepository {
    async getEditableFields(catalogItemId: number) {
        const row = this.findById(catalogItemId);
        if (!row) return;

        const authors = await getDbClient()
            .select({ name: bookAuthor.name })
            .from(bookAuthor)
            .where(eq(bookAuthor.catalogItemId, row.catalogItemId))
            .orderBy(asc(bookAuthor.position), asc(bookAuthor.id));

        return {
            fields: {
                name: row.name,
                pages: row.pages,
                language: row.language,
                synopsis: row.synopsis,
                lockStatus: row.locked,
                publishers: row.publisher,
                releaseDate: row.releaseDate,
                authors: authors.map(({ name }) => name).join(","),
            },
        };
    }

    async getCoverContributionState(catalogItemId: number) {
        return getDbClient()
            .select({ imageCover: catalogItem.imageCover })
            .from(catalogItem)
            .where(and(eq(catalogItem.id, catalogItemId), eq(catalogItem.kind, MediaType.BOOKS)))
            .get();
    }

    /** The default-cover predicate is part of the update, closing concurrent contribution races. */
    async replaceDefaultCover(catalogItemId: number, imageCover: string) {
        const updated = await getDbClient().update(catalogItem)
            .set({ imageCover: getImageFilename(imageCover) })
            .where(and(
                eq(catalogItem.id, catalogItemId),
                eq(catalogItem.kind, MediaType.BOOKS),
                eq(catalogItem.imageCover, "default.jpg"),
            ))
            .returning({ id: catalogItem.id });

        return updated.length === 1;
    }

    async synchronizeGenresByExternalId(apiId: string, names: string[]) {
        const item = getDbClient()
            .select({ id: catalogItem.id })
            .from(catalogItem)
            .where(and(
                eq(catalogItem.kind, MediaType.BOOKS),
                eq(catalogItem.primaryExternalId, apiId),
                eq(catalogItem.primaryProvider, "google-books"),
            )).get();

        if (!item) return false;

        const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
        if (unique.length === 0) return false;

        await getDbClient()
            .insert(catalogGenre)
            .values(unique.map((name) => ({ name })))
            .onConflictDoNothing();

        const genres = await getDbClient()
            .select().from(catalogGenre)
            .where(inArray(catalogGenre.name, unique));

        await getDbClient()
            .delete(catalogItemGenre)
            .where(eq(catalogItemGenre.catalogItemId, item.id));

        await getDbClient()
            .insert(catalogItemGenre)
            .values(genres.map(({ id }) => ({ catalogItemId: item.id, genreId: id })))
            .onConflictDoNothing();

        return true;
    }

    async getBooksWithoutGenres() {
        return getDbClient()
            .select({
                title: catalogItem.name,
                synopsis: catalogItem.synopsis,
                apiId: catalogItem.primaryExternalId,
                authors: sql<string>`group_concat(${bookAuthor.name}, ', ')`,
            })
            .from(catalogItem)
            .leftJoin(bookAuthor, eq(bookAuthor.catalogItemId, catalogItem.id))
            .leftJoin(catalogItemGenre, eq(catalogItemGenre.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.kind, MediaType.BOOKS), isNull(catalogItemGenre.catalogItemId)))
            .groupBy(catalogItem.id);
    }

    async updateEditableFields(catalogItemId: number, edit: BookCatalogEdit) {
        const catalogFields = {
            name: edit.name,
            synopsis: edit.synopsis,
            locked: edit.lockStatus,
            releaseDate: edit.releaseDate,
            imageCover: edit.imageCover ? getImageFilename(edit.imageCover) : undefined,
        };

        const detailFields = {
            pages: edit.pages,
            language: edit.language,
            publisher: edit.publishers,
        };

        if (hasDefinedCatalogFields(catalogFields)) {
            await getDbClient()
                .update(catalogItem)
                .set(catalogFields)
                .where(eq(catalogItem.id, catalogItemId));
        }

        if (hasDefinedCatalogFields(detailFields)) {
            await getDbClient()
                .update(bookDetails)
                .set(detailFields)
                .where(eq(bookDetails.catalogItemId, catalogItemId));
        }

        if (edit.authors?.length) {
            const names = [...new Set(edit.authors.map((name) => name.trim()).filter(Boolean))];

            await getDbClient()
                .delete(bookAuthor)
                .where(eq(bookAuthor.catalogItemId, catalogItemId));

            await getDbClient()
                .insert(bookAuthor)
                .values(names.map((name, index) => ({
                    name,
                    catalogItemId,
                    position: index + 1,
                })));
        }

        return true;
    }

    private findById(catalogItemId: number) {
        return getDbClient()
            .select({
                name: catalogItem.name,
                pages: bookDetails.pages,
                locked: catalogItem.locked,
                catalogItemId: catalogItem.id,
                synopsis: catalogItem.synopsis,
                language: bookDetails.language,
                publisher: bookDetails.publisher,
                releaseDate: catalogItem.releaseDate,
            })
            .from(catalogItem)
            .innerJoin(bookDetails, eq(bookDetails.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.kind, MediaType.BOOKS), eq(catalogItem.id, catalogItemId)))
            .get();
    }
}
