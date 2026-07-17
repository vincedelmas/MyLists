import {and, eq} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, libraryEntry, movieProgress} from "@/lib/server/database/schema";
import {libraryCsvBaseSelection, libraryCsvMetadata} from "@/lib/server/domain/media/shared/library/library-csv-export.shared";


export class MovieLibraryCsvExportQuery {
    export(userId: number) {
        const metadata = libraryCsvMetadata(MediaType.MOVIES);
        return getDbClient().select({ ...libraryCsvBaseSelection, total: movieProgress.watchCount })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(movieProgress, eq(movieProgress.libraryEntryId, libraryEntry.id))
            .where(and(eq(libraryEntry.userId, userId), eq(catalogItem.kind, MediaType.MOVIES)))
            .then((rows) => rows.map((row) => ({
                ...row,
                ...metadata,
                redo: Math.max(0, row.total - 1),
            })));
    }
}
