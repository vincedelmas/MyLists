import {and, eq} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, libraryEntry, mangaProgress} from "@/lib/server/database/schema";
import {libraryCsvBaseSelection, libraryCsvMetadata} from "@/lib/server/domain/media/shared/library/library-csv-export.shared";


export const exportMangaLibraryCsv = (userId: number) => {
    const metadata = libraryCsvMetadata(MediaType.MANGA);

    return getDbClient()
        .select({
            ...libraryCsvBaseSelection,
            redo: mangaProgress.rereadCount,
            total: mangaProgress.totalChaptersRead,
            currentChapter: mangaProgress.currentChapter,
        }).from(libraryEntry)
        .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
        .innerJoin(mangaProgress, eq(mangaProgress.libraryEntryId, libraryEntry.id))
        .where(and(eq(libraryEntry.userId, userId), eq(catalogItem.kind, MediaType.MANGA)))
        .then((rows) => rows.map((row) => ({ ...row, ...metadata })));
};
