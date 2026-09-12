import {notFound} from "@tanstack/react-router";
import type {AdminImportsSearch} from "@/lib/schemas/admin.schema";
import {FormattedError} from "@/lib/utils/error-classes";
import {logger} from "@/lib/server/core/logger";
import {withTransaction} from "@/lib/server/database/async-storage";
import {ImportRepository} from "@/lib/server/domain/imports/import.repository";
import {parseMyListsCsv} from "@/lib/server/domain/imports/parsers/mylists.parser";
import {ImportItemStatus, ImportJobStatus, ImportSource, MediaType} from "@/lib/utils/enums";
import {ImportItemOutcome, ImportItemsSelect, ImportParserRegistry, ParsedImport} from "@/lib/types/imports.types";


const OUTCOME_BATCH_SIZE = 200;
const ACTIVE_IMPORT_ERROR = "You already have an import in progress. Wait for it to finish before starting another.";

const importParserRegistry: ImportParserRegistry = {
    [ImportSource.MYLISTS]: parseMyListsCsv,
};


export class ImportService {
    constructor(
        private repository: typeof ImportRepository,
        private parsers: ImportParserRegistry = importParserRegistry,
    ) {
    }

    async claimNextQueuedJob() {
        return this.repository.claimNextQueuedJob();
    }

    requeueStaleProcessingJobs(staleAfterMinutes: number) {
        return withTransaction(() => this.repository.requeueStaleProcessingJobs(staleAfterMinutes));
    }

    async finalizeProcessingJob(jobId: number) {
        return this.repository.finalizeProcessingJob(jobId);
    }

    async markProcessingJobFailed(jobId: number, error: string) {
        return withTransaction(() => this.repository.markProcessingJobFailed(jobId, error));
    }

    async markItemsProcessing(jobId: number, itemIds: number[]) {
        return this.repository.markItemsProcessing(jobId, itemIds);
    }

    async applyItemOutcomes(jobId: number, outcomes: ImportItemOutcome[]) {
        const appliedItems: { id: number; status: ImportItemStatus }[] = [];

        for (let offset = 0; offset < outcomes.length; offset += OUTCOME_BATCH_SIZE) {
            const batch = outcomes.slice(offset, offset + OUTCOME_BATCH_SIZE);
            const uniqueBatch = [...new Map(batch.map(outcome => [outcome.itemId, outcome])).values()];

            const committedItems = withTransaction(() => {
                const items = this.repository.settleProcessingItems(jobId, uniqueBatch);
                if (items.length === 0) return [];

                const delta = {
                    processedCount: items.length,
                    failedCount: items.filter(item => item.status === ImportItemStatus.FAILED).length,
                    skippedCount: items.filter(item => item.status === ImportItemStatus.SKIPPED).length,
                    completedCount: items.filter(item => item.status === ImportItemStatus.COMPLETED).length,
                };

                const updatedJob = this.repository.incrementJobCounters(jobId, delta);
                if (!updatedJob) {
                    throw new Error(`Import job ${jobId} is no longer in processing state`);
                }

                return items;
            });

            appliedItems.push(...committedItems);
        }

        return appliedItems;
    }

    async getQueuedItemsByMediaType(jobId: number) {
        const items = await this.repository.getQueuedItemsForProcessingJob(jobId);
        const groups = new Map<MediaType, ImportItemsSelect[]>();

        for (const item of items) {
            if (!item.mediaType) {
                throw new Error(`Queued import item ${item.id} has no media type`);
            }

            const group = groups.get(item.mediaType) ?? [];
            group.push(item as ImportItemsSelect);
            groups.set(item.mediaType, group);
        }

        return groups;
    }

    async getImportJob(userId: number, jobId: number) {
        const job = await this.repository.findJobForUser(jobId, userId);
        if (!job) throw notFound();

        let jobsAhead: number | null = null;
        if (job.status === ImportJobStatus.PROCESSING) {
            jobsAhead = 0;
        }
        else if (job.status === ImportJobStatus.QUEUED) {
            jobsAhead = await this.repository.countJobsAhead(job);
        }

        return { job, jobsAhead };
    }

    async getAllUserJobs(userId: number) {
        return this.repository.getAllUserJobs(userId);
    }

    getJobsForAdmin(search: AdminImportsSearch) {
        return this.repository.getJobsForAdmin(search);
    }

    getIssuesForAdmin(jobId: number, page?: number, perPage?: number) {
        return this.repository.getIssueItems(jobId, page, perPage);
    }

    async deleteImportJob(userId: number, jobId: number) {
        const deletedJob = await this.repository.deleteTerminalJob(jobId, userId);
        if (deletedJob) return deletedJob;

        const job = await this.repository.findJobForUser(jobId, userId);
        if (!job) throw notFound();

        throw new FormattedError("Only finished import jobs can be deleted.");
    }

    async createImportJob(userId: number, source: ImportSource, contents: string) {
        const activeJob = await this.repository.findActiveJobForUser(userId);
        if (activeJob) {
            throw new FormattedError(ACTIVE_IMPORT_ERROR);
        }

        let parsed: ParsedImport | string;
        try {
            const parser = this.parsers[source];
            if (!parser) throw new Error(`Import source "${source}" is not supported yet`);
            parsed = parser(contents);
        }
        catch (error) {
            parsed = error instanceof Error ? error.message : "The import could not be parsed. Please re-export your list and try again.";
        }

        try {
            // Commit a queued or failed job in one transaction. A stopped web
            // process must never leave a user blocked by a half-created job.
            return withTransaction(() => {
                const job = this.repository.createJob(userId, source);
                if (typeof parsed === "string") {
                    const failedJob = this.repository.markJobFailed(job.id, parsed);
                    if (!failedJob) throw new Error(`Import job ${job.id} could not be marked failed`);
                    return failedJob;
                }

                this.repository.insertParsedItems(job.id, parsed.items);
                const queuedJob = this.repository.markJobQueued(job.id, parsed.totalCount, parsed.failedCount);
                if (!queuedJob) {
                    throw new Error(`Import job ${job.id} is no longer in parsing state`);
                }

                return queuedJob;
            });
        }
        catch (error) {
            const message = String(error);
            if (message.includes("ux_import_jobs_user_active") || message.includes("import_jobs.user_id")) {
                throw new FormattedError(ACTIVE_IMPORT_ERROR);
            }

            logger.error({ err: error, userId }, "Could not save import job");
            throw new FormattedError("The import could not be saved. Please try again.");
        }
    }

    async getImportIssues(userId: number, jobId: number, page?: number, perPage?: number) {
        const job = await this.repository.findJobForUser(jobId, userId);
        if (!job) throw notFound();

        return this.repository.getIssueItems(job.id, page, perPage);
    }
}
