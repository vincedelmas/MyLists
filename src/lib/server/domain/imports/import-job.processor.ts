import {ImportService} from "@/lib/server/domain/imports/import.service";
import {MediaMatcherRegistry} from "@/lib/server/domain/imports/matchers/media-matcher.registry";


export class ImportJobProcessor {
    constructor(
        private importService: ImportService,
        private matcherRegistry: typeof MediaMatcherRegistry,
    ) {
    }

    async requeueStaleProcessingJobs(staleAfterMinutes: number) {
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
            const errorMessage = error instanceof Error ? error.message : String(error);
            await this.importService.markProcessingJobFailed(job.id, errorMessage);
            throw error;
        }
    }
}
