import {ImportService} from "@/lib/server/domain/imports/import.service";
import {MediaMatcherRegistry} from "@/lib/server/domain/imports/matchers/media-matcher.registry";
import {logger} from "@/lib/server/core/logger";


export class ImportJobProcessor {
    constructor(
        private importService: ImportService,
        private matcherRegistry: typeof MediaMatcherRegistry,
    ) {
    }

    requeueStaleProcessingJobs(staleAfterMinutes: number) {
        return this.importService.requeueStaleProcessingJobs(staleAfterMinutes);
    }

    async processNextJob() {
        const job = await this.importService.claimNextQueuedJob();
        if (!job) return null;

        try {
            const context = { jobId: job.id, userId: job.userId };
            const groups = await this.importService.getQueuedItemsByMediaType(job.id);

            for (const [mediaType, queuedItems] of groups) {
                const markedItems = await this.importService.markItemsProcessing(job.id, queuedItems.map(item => item.id));
                const markedIds = new Set(markedItems.map(item => item.id));
                const processingItems = queuedItems.filter(item => markedIds.has(item.id));
                if (processingItems.length === 0) continue;

                const matcher = this.matcherRegistry.get(mediaType);
                for await (const outcomes of matcher.match(context, processingItems)) {
                    await this.importService.applyItemOutcomes(job.id, outcomes);
                }
            }

            const finalizedJob = await this.importService.finalizeProcessingJob(job.id);
            if (!finalizedJob) {
                throw new Error(`Import job ${job.id} could not be finalized because it still has unfinished items`);
            }

            return finalizedJob;
        }
        catch (error) {
            logger.error({ err: error, jobId: job.id }, "Import processing failed");
            const failedJob = await this.importService.markProcessingJobFailed(job.id,
                "The import stopped unexpectedly. Entries already imported were kept. Please try importing the file again.");
            if (!failedJob) throw error;
            return failedJob;
        }
    }
}
