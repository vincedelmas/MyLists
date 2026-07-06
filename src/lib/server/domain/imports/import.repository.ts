import {and, eq, sql} from "drizzle-orm";
import {ParsedImportItem} from "@/lib/types/imports.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import {importItems, importJobs} from "@/lib/server/database/schema";
import {ImportItemStatus, ImportJobStatus, ImportSource} from "@/lib/utils/enums";


const INSERT_BATCH_SIZE = 300;


export class ImportRepository {
    static async createJob(userId: number, source: ImportSource) {
        const [job] = await getDbClient()
            .insert(importJobs)
            .values({
                userId,
                source,
                status: ImportJobStatus.PARSING,
            }).returning();

        return job;
    }

    static async insertParsedItems(jobId: number, items: ParsedImportItem[]) {
        for (let offset = 0; offset < items.length; offset += INSERT_BATCH_SIZE) {
            const batch = items.slice(offset, offset + INSERT_BATCH_SIZE);

            await getDbClient()
                .insert(importItems)
                .values(batch.map((item) => ({
                    jobId,
                    name: item.name,
                    status: item.status,
                    payload: item.payload,
                    rowNumber: item.rowNumber,
                    mediaType: item.mediaType,
                    releaseDate: item.releaseDate,
                    statusReason: item.statusReason,
                    externalApiId: item.externalApiId,
                    externalApiSource: item.externalApiSource,
                })));
        }
    }

    static async markJobQueued(jobId: number, totalCount: number, failedCount: number) {
        const [job] = await getDbClient()
            .update(importJobs)
            .set({
                totalCount,
                failedCount,
                processedCount: failedCount,
                status: ImportJobStatus.QUEUED,
                updatedAt: sql`datetime('now')`,
            })
            .where(and(eq(importJobs.id, jobId), eq(importJobs.status, ImportJobStatus.PARSING)))
            .returning();

        return job ?? null;
    }

    static async markJobFailed(jobId: number, error: string) {
        const [job] = await getDbClient()
            .update(importJobs)
            .set({
                status: ImportJobStatus.FAILED,
                updatedAt: sql`datetime('now')`,
                finishedAt: sql`datetime('now')`,
                error: error.slice(0, 2_000),
            })
            .where(and(eq(importJobs.id, jobId), eq(importJobs.status, ImportJobStatus.PARSING)))
            .returning();

        return job ?? null;
    }

    static countFailedItems(items: ParsedImportItem[]) {
        return items.filter((item) => item.status === ImportItemStatus.FAILED).length;
    }
}
