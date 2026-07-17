import {and, eq} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, libraryEntry, mangaProgress} from "@/lib/server/database/schema";
import {libraryCsvBaseSelection, libraryCsvMetadata} from "@/lib/server/domain/library/library-csv-export.shared";


export class MangaLibraryCsvExportQuery {
    export(userId: number) {
        const metadata = libraryCsvMetadata(MediaType.MANGA);
        return getDbClient().select({
            ...libraryCsvBaseSelection,
            currentChapter: mangaProgress.currentChapter,
            redo: mangaProgress.rereadCount,
            total: mangaProgress.totalChaptersRead,
        }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(mangaProgress, eq(mangaProgress.libraryEntryId, libraryEntry.id))
            .where(and(eq(libraryEntry.userId, userId), eq(catalogItem.kind, MediaType.MANGA)))
            .then((rows) => rows.map((row) => ({ ...row, ...metadata })));
    }
}
