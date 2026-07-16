import {and, eq, inArray, isNotNull} from "drizzle-orm";
import {getImageUrl} from "@/lib/utils/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, libraryEntry} from "@/lib/server/database/schema";


/** The catalog fields genuinely shared by every collection item. */
export class CollectionCatalogCardRepository {
    async findByCatalogItemIds(catalogItemIds: number[], viewerId?: number) {
        if (catalogItemIds.length === 0) return [];
        const rows = await getDbClient().select({
            catalogItemId: catalogItem.id,
            id: catalogItem.id,
            kind: catalogItem.kind,
            name: catalogItem.name,
            imageCover: catalogItem.imageCover,
            releaseDate: catalogItem.releaseDate,
            inUserList: isNotNull(libraryEntry.id).mapWith(Boolean),
        }).from(catalogItem)
            .leftJoin(libraryEntry, and(
                eq(libraryEntry.catalogItemId, catalogItem.id),
                viewerId === undefined ? undefined : eq(libraryEntry.userId, viewerId),
            ))
            .where(inArray(catalogItem.id, [...new Set(catalogItemIds)]));
        return rows.map(({ imageCover, ...row }) => ({
            ...row,
            imageCover: getImageUrl(`${row.kind}-covers`, imageCover),
        }));
    }
}
