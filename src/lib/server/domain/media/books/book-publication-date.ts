import {and, eq, min} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {bookEditions, books, whichCameFirstMedia} from "@/lib/server/database/schema";

// Edition dates are provisional. A confirmed work date or a manual correction takes precedence.
export function syncBookPublicationDate(mediaId: number, openLibraryDate?: string | null) {
    const tx = getDbClient();
    const work = tx.select({date: books.releaseDate, source: books.releaseDateSource}).from(books).where(eq(books.id, mediaId)).get()!;
    const releaseDate = work.source === "manual" ? work.date : openLibraryDate ?? (work.source === "openLibrary" ? work.date
        : tx.select({date: min(bookEditions.releaseDate)}).from(bookEditions).where(eq(bookEditions.mediaId, mediaId)).get()!.date);
    if (work.source !== "manual") tx.update(books).set({releaseDate, releaseDateSource: openLibraryDate ? "openLibrary" : work.source}).where(eq(books.id, mediaId)).run();
    const poolEntry = and(eq(whichCameFirstMedia.mediaType, MediaType.BOOKS), eq(whichCameFirstMedia.mediaId, mediaId));
    if (releaseDate) tx.update(whichCameFirstMedia).set({releaseDate}).where(poolEntry).run();
    else tx.delete(whichCameFirstMedia).where(poolEntry).run();
    return releaseDate;
}
