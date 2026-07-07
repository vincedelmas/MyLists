import {paginate} from "@/lib/server/database/pagination";
import {getDbClient} from "@/lib/server/database/async-storage";
import {importItems, importJobs} from "@/lib/server/database/schema";
import {ImportItemStatus, ImportJobStatus, ImportSource} from "@/lib/utils/enums";
import {ImportItemOutcome, ImportJobCounterDelta, ParsedImportItem} from "@/lib/types/imports.types";
import {and, asc, count, eq, exists, getTableColumns, inArray, lt, notExists, or, sql} from "drizzle-orm";


const INSERT_BATCH_SIZE = 300;

const TERMINAL_JOB_STATUSES = [
    ImportJobStatus.FAILED,
    ImportJobStatus.COMPLETED,
    ImportJobStatus.CANCELLED,
    ImportJobStatus.COMPLETED_WITH_ERRORS,
] as const;


export class ImportRepository {
    static async markProcessingJobFailed(jobId: number, error: string) {
        const [job] = await getDbClient()
            .update(importJobs)
            .set({
                error: error.slice(0, 2_000),
                status: ImportJobStatus.FAILED,
                updatedAt: sql`datetime('now')`,
                finishedAt: sql`datetime('now')`,
            })
            .where(and(eq(importJobs.id, jobId), eq(importJobs.status, ImportJobStatus.PROCESSING)))
            .returning();

        return job ?? null;
    }

    static async finalizeProcessingJob(jobId: number) {
        const db = getDbClient();

        const unfinishedItems = db
            .select({ id: importItems.id })
            .from(importItems)
            .where(and(
                eq(importItems.jobId, jobId),
                inArray(importItems.status, [ImportItemStatus.QUEUED, ImportItemStatus.PROCESSING]),
            ));

        const [job] = await db
            .update(importJobs)
            .set({
                updatedAt: sql`datetime('now')`,
                finishedAt: sql`datetime('now')`,
                status: sql`
                    CASE
                        WHEN ${importJobs.failedCount} > 0 OR ${importJobs.skippedCount} > 0
                        THEN ${ImportJobStatus.COMPLETED_WITH_ERRORS}
                        ELSE ${ImportJobStatus.COMPLETED}
                    END
                `,
            })
            .where(and(
                eq(importJobs.id, jobId),
                eq(importJobs.status, ImportJobStatus.PROCESSING),
                eq(importJobs.processedCount, importJobs.totalCount),
                notExists(unfinishedItems),
                sql`
                    ${importJobs.processedCount} =
                    ${importJobs.completedCount} + ${importJobs.failedCount} + ${importJobs.skippedCount}
                `,
            ))
            .returning();

        return job ?? null;
    }

    static async markItemsProcessing(jobId: number, itemIds: number[]) {
        if (itemIds.length === 0) return [];

        const db = getDbClient();

        const activeJob = db
            .select({ id: importJobs.id })
            .from(importJobs)
            .where(and(eq(importJobs.id, jobId), eq(importJobs.status, ImportJobStatus.PROCESSING)));

        return db
            .update(importItems)
            .set({
                updatedAt: sql`datetime('now')`,
                status: ImportItemStatus.PROCESSING,
            })
            .where(and(
                exists(activeJob),
                eq(importItems.jobId, jobId),
                inArray(importItems.id, itemIds),
                eq(importItems.status, ImportItemStatus.QUEUED),
            ))
            .returning({ id: importItems.id });
    }

    static async settleProcessingItems(jobId: number, outcomes: ImportItemOutcome[]) {
        if (outcomes.length === 0) return [];

        const values = sql.join(outcomes.map(outcome => sql`(
            ${outcome.itemId},
            ${outcome.status},
            ${outcome.matchedMediaId ?? null},
            ${outcome.statusReason?.slice(0, 500) ?? null}
        )`), sql.raw(", "));

        return getDbClient().all<{ id: number; status: ImportItemStatus }>(sql`
            WITH outcome_values(item_id, next_status, matched_media_id, status_reason) AS (
                VALUES ${values}
            )
            UPDATE ${importItems}
            SET
                status = (SELECT next_status FROM outcome_values WHERE item_id = id),
                matched_media_id = (SELECT matched_media_id FROM outcome_values WHERE item_id = id),
                status_reason = (SELECT status_reason FROM outcome_values WHERE item_id = id),
                updated_at = datetime('now')
            WHERE job_id = ${jobId}
              AND status = ${ImportItemStatus.PROCESSING}
              AND id IN (SELECT item_id FROM outcome_values)
              AND EXISTS (
                  SELECT 1
                  FROM ${importJobs}
                  WHERE ${importJobs.id} = ${jobId}
                    AND ${importJobs.status} = ${ImportJobStatus.PROCESSING}
              )
            RETURNING id, status
        `);
    }

    static async incrementJobCounters(jobId: number, delta: ImportJobCounterDelta) {
        const [job] = await getDbClient()
            .update(importJobs)
            .set({
                updatedAt: sql`datetime('now')`,
                failedCount: sql`${importJobs.failedCount} + ${delta.failedCount}`,
                skippedCount: sql`${importJobs.skippedCount} + ${delta.skippedCount}`,
                completedCount: sql`${importJobs.completedCount} + ${delta.completedCount}`,
                processedCount: sql`${importJobs.processedCount} + ${delta.processedCount}`,
            })
            .where(and(eq(importJobs.id, jobId), eq(importJobs.status, ImportJobStatus.PROCESSING)))
            .returning();

        return job ?? null;
    }

    static async claimNextQueuedJob() {
        const db = getDbClient();

        const nextQueuedJob = db
            .select({ id: importJobs.id })
            .from(importJobs)
            .where(eq(importJobs.status, ImportJobStatus.QUEUED))
            .orderBy(asc(importJobs.createdAt), asc(importJobs.id))
            .limit(1);

        const processingJob = db
            .select({ id: importJobs.id })
            .from(importJobs)
            .where(eq(importJobs.status, ImportJobStatus.PROCESSING));

        const [claimedJob] = await db
            .update(importJobs)
            .set({
                startedAt: sql`datetime('now')`,
                updatedAt: sql`datetime('now')`,
                status: ImportJobStatus.PROCESSING,
            })
            .where(and(
                notExists(processingJob),
                eq(importJobs.id, nextQueuedJob),
                eq(importJobs.status, ImportJobStatus.QUEUED),
            ))
            .returning();

        return claimedJob ?? null;
    }

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

    static async deleteTerminalJob(jobId: number, userId: number) {
        const [deletedJob] = await getDbClient()
            .delete(importJobs)
            .where(and(
                eq(importJobs.id, jobId),
                eq(importJobs.userId, userId),
                inArray(importJobs.status, TERMINAL_JOB_STATUSES),
            ))
            .returning({ id: importJobs.id });

        return deletedJob ?? null;
    }

    static async getQueuedItemsForProcessingJob(jobId: number) {
        return getDbClient()
            .select({ ...getTableColumns(importItems) })
            .from(importItems)
            .innerJoin(importJobs, eq(importJobs.id, importItems.jobId))
            .where(and(
                eq(importItems.jobId, jobId),
                eq(importItems.status, ImportItemStatus.QUEUED),
                eq(importJobs.status, ImportJobStatus.PROCESSING),
            ))
            .orderBy(asc(importItems.mediaType), asc(importItems.rowNumber));
    }

    static async findJobForUser(jobId: number, userId: number) {
        return getDbClient()
            .select()
            .from(importJobs)
            .where(and(eq(importJobs.id, jobId), eq(importJobs.userId, userId)))
            .get();
    }

    static async countJobsAhead(job: typeof importJobs.$inferSelect) {
        const result = getDbClient()
            .select({ count: count() })
            .from(importJobs)
            .where(or(
                eq(importJobs.status, ImportJobStatus.PROCESSING),
                and(
                    eq(importJobs.status, ImportJobStatus.QUEUED),
                    or(
                        lt(importJobs.createdAt, job.createdAt),
                        and(eq(importJobs.createdAt, job.createdAt), lt(importJobs.id, job.id)),
                    ),
                ),
            )).get();

        return result?.count ?? 0;
    }

    static async getIssueItems(jobId: number, page?: number, perPage?: number) {
        const issueCondition = and(
            eq(importItems.jobId, jobId),
            inArray(importItems.status, [ImportItemStatus.FAILED, ImportItemStatus.SKIPPED]),
        );

        return paginate({
            page,
            perPage,
            maxPerPage: 25,
            getTotal: () => {
                const result = getDbClient()
                    .select({ count: count() })
                    .from(importItems)
                    .where(issueCondition)
                    .get();

                return result?.count ?? 0;
            },
            getItems: ({ limit, offset }) => {
                return getDbClient()
                    .select({
                        id: importItems.id,
                        name: importItems.name,
                        status: importItems.status,
                        payload: importItems.payload,
                        rowNumber: importItems.rowNumber,
                        mediaType: importItems.mediaType,
                        releaseDate: importItems.releaseDate,
                        statusReason: importItems.statusReason,
                        externalApiId: importItems.externalApiId,
                        externalApiSource: importItems.externalApiSource,
                    })
                    .from(importItems)
                    .where(issueCondition)
                    .orderBy(asc(importItems.rowNumber))
                    .limit(limit)
                    .offset(offset);
            },
        });
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
