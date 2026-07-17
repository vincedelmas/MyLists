import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {and, asc, eq, inArray, isNull, notExists} from "drizzle-orm";
import {catalogItem, editorialCollectionItem, libraryEntry,} from "@/lib/server/database/schema";


export class CatalogOrphanRepository {
    async getOrphanedIds(kind: MediaType) {
        const db = getDbClient();

        const rows = await db
            .select({ id: catalogItem.id })
            .from(catalogItem)
            .leftJoin(libraryEntry, eq(libraryEntry.catalogItemId, catalogItem.id))
            .where(and(
                isNull(libraryEntry.id),
                eq(catalogItem.kind, kind),
                notExists(db
                    .select({ catalogItemId: editorialCollectionItem.catalogItemId })
                    .from(editorialCollectionItem)
                    .where(eq(editorialCollectionItem.catalogItemId, catalogItem.id))
                ),
            ))
            .orderBy(asc(catalogItem.id));

        return rows.map(({ id }) => id);
    }

    async deleteItems(kind: MediaType, catalogItemIds: number[]) {
        if (catalogItemIds.length === 0) return;

        await getDbClient()
            .delete(catalogItem)
            .where(and(eq(catalogItem.kind, kind), inArray(catalogItem.id, catalogItemIds)));
    }
}
