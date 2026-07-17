import {notFound} from "@tanstack/react-router";
import {FormattedError} from "@/lib/utils/error-classes";
import {withTransaction} from "@/lib/server/database/async-storage";
import {ImportRepository} from "@/lib/server/domain/imports/import.repository";
import {ImportItemStatus, ImportJobStatus, ImportSource, MediaType} from "@/lib/utils/enums";
import {ImportItemOutcome, ImportItemsSelect, ImportParserRegistry} from "@/lib/types/imports.types";


const OUTCOME_BATCH_SIZE = 200;
const ACTIVE_IMPORT_ERROR = "You already have an import in progress. Wait for it to finish before starting another.";

export class ImportService {
    constructor(
        private repository: typeof ImportRepository,
        private parsers: ImportParserRegistry = {},
    ) {
    }

    async claimNextQueuedJob() {
        return this.repository.claimNextQueuedJob();
    }

    async requeueStaleProcessingJobs(staleAfterMinutes: number) {
        return withTransaction(() => this.repository.requeueStaleProcessingJobs(staleAfterMinutes));
    }

    async finalizeProcessingJob(jobId: number) {
        return this.repository.finalizeProcessingJob(jobId);
    }

    async markProcessingJobFailed(jobId: number, error: string) {
        return this.repository.markProcessingJobFailed(jobId, error);
    }

    async markItemsProcessing(jobId: number, itemIds: number[]) {
        return this.repository.markItemsProcessing(jobId, itemIds);
    }

    async applyItemOutcomes(jobId: number, outcomes: ImportItemOutcome[]) {
        const appliedItems: { id: number; status: ImportItemStatus }[] = [];

        for (let offset = 0; offset < outcomes.length; offset += OUTCOME_BATCH_SIZE) {
            const batch = outcomes.slice(offset, offset + OUTCOME_BATCH_SIZE);
            const uniqueBatch = [...new Map(batch.map(outcome => [outcome.itemId, outcome])).values()];

            const committedItems = await withTransaction(async () => {
                const items = await this.repository.settleProcessingItems(jobId, uniqueBatch);
                if (items.length === 0) return [];

                const delta = {
                    processedCount: items.length,
                    failedCount: items.filter(item => item.status === ImportItemStatus.FAILED).length,
                    skippedCount: items.filter(item => item.status === ImportItemStatus.SKIPPED).length,
                    completedCount: items.filter(item => item.status === ImportItemStatus.COMPLETED).length,
                };

                const updatedJob = await this.repository.incrementJobCounters(jobId, delta);
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

        let job: Awaited<ReturnType<typeof ImportRepository.createJob>>;
        try {
            job = await this.repository.createJob(userId, source);
        }
        catch (error) {
            const message = String(error);
            if (message.includes("ux_import_jobs_user_active") || message.includes("import_jobs.user_id")) {
                throw new FormattedError(ACTIVE_IMPORT_ERROR);
            }

            throw error;
        }

        try {
            const parser = this.parsers[source];
            if (!parser) throw new Error(`Import source "${source}" is not supported yet`);

            const parsed = parser(contents);
            const queuedJob = await withTransaction(async () => {
                await this.repository.insertParsedItems(job.id, parsed.items);
                return this.repository.markJobQueued(job.id, parsed.totalCount, parsed.failedCount);
            });

            if (!queuedJob) {
                throw new Error(`Import job ${job.id} is no longer in parsing state`);
            }

            return queuedJob;
        }
        catch (error) {
            const errorMessage = error instanceof Error
                ? String(error.message) :
                "The import could not be parsed due to an internal error";

            const failedJob = await this.repository.markJobFailed(job.id, errorMessage);
            if (failedJob) return failedJob;

            throw error;
        }
    }

    async getImportIssues(userId: number, jobId: number, page?: number, perPage?: number) {
        const job = await this.repository.findJobForUser(jobId, userId);
        if (!job) throw notFound();

        return this.repository.getIssueItems(job.id, page, perPage);
    }
}
