import {and, eq} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, gameProgress, libraryEntry} from "@/lib/server/database/schema";
import {libraryCsvBaseSelection, libraryCsvMetadata} from "@/lib/server/domain/media/shared/library/library-csv-export.shared";


export class GameLibraryCsvExportQuery {
    export(userId: number) {
        const metadata = libraryCsvMetadata(MediaType.GAMES);
        return getDbClient().select({
            ...libraryCsvBaseSelection,
            playtime: gameProgress.playtimeMinutes,
            platform: gameProgress.platform,
        }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(gameProgress, eq(gameProgress.libraryEntryId, libraryEntry.id))
            .where(and(eq(libraryEntry.userId, userId), eq(catalogItem.kind, MediaType.GAMES)))
            .then((rows) => rows.map((row) => ({ ...row, ...metadata })));
    }
}
