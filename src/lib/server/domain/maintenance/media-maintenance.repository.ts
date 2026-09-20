import {MediaType} from "@/lib/utils/enums";
import {toDateInputValue} from "@/lib/utils/formatting/date";
import {getDbClient} from "@/lib/server/database/async-storage";
import {and, eq, gte, inArray, isNotNull, notExists, sql} from "drizzle-orm";
import {collectionItems, dailyMediadle} from "@/lib/server/database/schema";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";


export class MediaMaintenanceRepository {
    static async getCoverFilenames(mediaType: MediaType) {
        const {tables: {mediaTable}, maintenance} = getServerMediaDefinition(mediaType).repository;

        const coverFilenames = await getDbClient()
            .select({ imageCover: mediaTable.imageCover })
            .from(mediaTable);

        if (maintenance?.additionalCoverReferences) {
            coverFilenames.push(...getDbClient().all<{imageCover: string}>(maintenance.additionalCoverReferences));
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
        const {tables: {mediaTable, listTable}, maintenance} = getServerMediaDefinition(mediaType).repository;

        const tx = getDbClient();
        const today = toDateInputValue(new Date(), { timeZone: "utc" });

        const mediaToDelete = tx
            .select({ id: mediaTable.id })
            .from(mediaTable)
            .where(and(
                maintenance?.retainOrphan ? sql`NOT (${maintenance.retainOrphan})` : undefined,
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
