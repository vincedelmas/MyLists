import {MediaType} from "@/lib/utils/enums";
import {toDateInputValue} from "@/lib/utils/formatting/date";
import {getDbClient} from "@/lib/server/database/async-storage";
import {and, eq, gte, inArray, isNotNull, notExists, or, sql} from "drizzle-orm";
import {bookEditions, bookWorkAudit, bookWorkCandidates, collectionItems, dailyMediadle} from "@/lib/server/database/schema";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";


export class MediaMaintenanceRepository {
    static async getCoverFilenames(mediaType: MediaType) {
        const { mediaTable } = getServerMediaDefinition(mediaType).repository.tables;

        const coverFilenames = await getDbClient()
            .select({ imageCover: mediaTable.imageCover })
            .from(mediaTable);

        if (mediaType === MediaType.BOOKS) {
            coverFilenames.push(...getDbClient().select({ imageCover: bookEditions.imageCover }).from(bookEditions).all());
            coverFilenames.push(...getDbClient().all<{imageCover: string}>(sql`
                SELECT DISTINCT value AS imageCover FROM ${bookWorkAudit}, json_tree(${bookWorkAudit.snapshot})
                WHERE key IN ('imageCover', 'customCover') AND type = 'text'
            `));
        }
        return coverFilenames.map(({ imageCover }) => imageCover.split("/").pop() as string);
    }

    static async getCustomCoverFilenames(mediaType: MediaType) {
        const { listTable } = getServerMediaDefinition(mediaType).repository.tables;

        const coverFilenames = await getDbClient()
            .select({ customCover: listTable.customCover })
            .from(listTable)
            .where(isNotNull(listTable.customCover));

        return coverFilenames
            .map(({ customCover }) => customCover?.split("/").pop() as string | undefined)
            .filter((cover): cover is string => !!cover);
    }

    static getOrphanedMediaIds(mediaType: MediaType) {
        const { mediaTable, listTable } = getServerMediaDefinition(mediaType).repository.tables;

        const tx = getDbClient();
        const today = toDateInputValue(new Date(), { timeZone: "utc" });

        const mediaToDelete = tx
            .select({ id: mediaTable.id })
            .from(mediaTable)
            .where(and(
                // Keep catalogue grouping decisions even when nobody currently tracks the work.
                mediaType === MediaType.BOOKS ? and(
                    notExists(tx.select().from(bookWorkCandidates).where(or(eq(bookWorkCandidates.firstWorkId, mediaTable.id), eq(bookWorkCandidates.secondWorkId, mediaTable.id)))),
                    notExists(tx.select().from(bookWorkAudit).where(or(eq(bookWorkAudit.sourceWorkId, mediaTable.id), eq(bookWorkAudit.targetWorkId, mediaTable.id)))),
                    sql`(SELECT count(*) FROM ${bookEditions} WHERE ${bookEditions.mediaId} = ${mediaTable.id}) <= 1`,
                ) : undefined,
                notExists(tx.select()
                    .from(listTable)
                    .where(eq(listTable.mediaId, mediaTable.id))
                ),
                notExists(tx.select()
                    .from(collectionItems)
                    .where(and(eq(collectionItems.mediaId, mediaTable.id), eq(collectionItems.mediaType, mediaType)))
                ),
                notExists(tx.select()
                    .from(dailyMediadle)
                    .where(and(
                        eq(dailyMediadle.mediaId, mediaTable.id),
                        eq(dailyMediadle.mediaType, mediaType),
                        gte(dailyMediadle.date, today),
                    ))
                )
            )).all();

        return mediaToDelete.map((media) => media.id);
    }

    static removeMediaByIds(mediaType: MediaType, mediaIds: number[]) {
        const { mediaTable, deleteDependents } = getServerMediaDefinition(mediaType).repository.tables;

        // Delete on other tables
        for (const table of deleteDependents) {
            getDbClient()
                .delete(table)
                .where(inArray(table.mediaId, mediaIds)).run();
        }

        // Delete on main table
        getDbClient()
            .delete(mediaTable)
            .where(inArray(mediaTable.id, mediaIds)).run();
    }
}
