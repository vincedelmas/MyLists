import {and, eq, isNotNull} from "drizzle-orm";
import {getImageFilename} from "@/lib/utils/image-url";
import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, libraryEntry} from "@/lib/server/database/schema";


/** Cover filenames retained by the catalog or a user's family-specific custom cover. */
export class CatalogCoverReferenceRepository {
    async getReferences(kind: MediaType) {
        const [catalogRows, customRows] = await Promise.all([
            getDbClient().select({ value: catalogItem.imageCover }).from(catalogItem)
                .where(eq(catalogItem.kind, kind)),
            getDbClient().select({ value: libraryEntry.customCover }).from(libraryEntry)
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .where(and(eq(catalogItem.kind, kind), isNotNull(libraryEntry.customCover))),
        ]);

        return {
            catalog: catalogRows.map(({ value }) => getImageFilename(value)),
            custom: customRows.map(({ value }) => getImageFilename(value!)),
        };
    }
}
