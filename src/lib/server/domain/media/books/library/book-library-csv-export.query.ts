import {and, eq} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {bookProgress, catalogItem, libraryEntry} from "@/lib/server/database/schema";
import {libraryCsvBaseSelection, libraryCsvMetadata} from "@/lib/server/domain/media/shared/library/library-csv-export.shared";


export class BookLibraryCsvExportQuery {
    export(userId: number) {
        const metadata = libraryCsvMetadata(MediaType.BOOKS);
        return getDbClient().select({
            ...libraryCsvBaseSelection,
            actualPage: bookProgress.currentPage,
            redo: bookProgress.rereadCount,
            total: bookProgress.totalPagesRead,
        }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(bookProgress, eq(bookProgress.libraryEntryId, libraryEntry.id))
            .where(and(eq(libraryEntry.userId, userId), eq(catalogItem.kind, MediaType.BOOKS)))
            .then((rows) => rows.map((row) => ({ ...row, ...metadata })));
    }
}
