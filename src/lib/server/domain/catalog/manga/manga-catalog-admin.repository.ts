import {and, eq, inArray} from "drizzle-orm";
import {getImageFilename} from "@/lib/utils/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogGenre, catalogItem, catalogItemGenre, mangaDetails,} from "@/lib/server/database/schema";
import {MediaType} from "@/lib/utils/enums";
import {hasDefinedCatalogFields} from "@/lib/server/domain/catalog/catalog-admin-fields";


export type MangaCatalogEdit = Partial<{
    name: string;
    releaseDate: string | null;
    synopsis: string | null;
    lockStatus: boolean;
    imageCover: string;
    chapters: number | null;
    publishers: string | null;
    genres: string[];
}>;


export class MangaCatalogAdminRepository {
    async getEditableFields(catalogItemId: number) {
        const row = this.findById(catalogItemId);
        if (!row) return;
        return {
            fields: {
                name: row.name,
                releaseDate: row.releaseDate,
                chapters: row.chapters,
                publishers: row.publisher,
                synopsis: row.synopsis,
                lockStatus: row.locked,
            },
        };
    }

    async updateEditableFields(catalogItemId: number, edit: MangaCatalogEdit) {
        const catalogFields = {
            name: edit.name,
            releaseDate: edit.releaseDate,
            synopsis: edit.synopsis,
            locked: edit.lockStatus,
            imageCover: edit.imageCover ? getImageFilename(edit.imageCover) : undefined,
        };
        const detailFields = {
            chapters: edit.chapters,
            publisher: edit.publishers,
        };
        if (hasDefinedCatalogFields(catalogFields)) {
            await getDbClient().update(catalogItem).set(catalogFields).where(eq(catalogItem.id, catalogItemId));
        }
        if (hasDefinedCatalogFields(detailFields)) {
            await getDbClient().update(mangaDetails).set(detailFields).where(eq(mangaDetails.catalogItemId, catalogItemId));
        }
        if (edit.genres?.length) {
            const names = [...new Set(edit.genres.map((name) => name.trim()).filter(Boolean))];
            await getDbClient().insert(catalogGenre).values(names.map((name) => ({ name }))).onConflictDoNothing();
            const genres = await getDbClient().select().from(catalogGenre).where(inArray(catalogGenre.name, names));
            await getDbClient().delete(catalogItemGenre).where(eq(catalogItemGenre.catalogItemId, catalogItemId));
            await getDbClient().insert(catalogItemGenre).values(genres.map(({ id }) => ({
                catalogItemId,
                genreId: id,
            }))).onConflictDoNothing();
        }
        return true;
    }

    private findById(catalogItemId: number) {
        return getDbClient().select({
            name: catalogItem.name,
            releaseDate: catalogItem.releaseDate,
            synopsis: catalogItem.synopsis,
            locked: catalogItem.locked,
            chapters: mangaDetails.chapters,
            publisher: mangaDetails.publisher,
        }).from(catalogItem)
            .innerJoin(mangaDetails, eq(mangaDetails.catalogItemId, catalogItem.id))
            .where(and(
                eq(catalogItem.kind, MediaType.MANGA),
                eq(catalogItem.id, catalogItemId),
            )).get();
    }
}
