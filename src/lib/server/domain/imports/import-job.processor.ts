import {logger} from "@/lib/server/core/logger";
import {ImportService} from "@/lib/server/domain/imports/import.service";
import {providerRequestContext} from "@/lib/server/core/provider-request-context";
import {ProviderRequestError} from "@/lib/server/api-providers/api/provider-error";
import {MediaMatcherRegistry} from "@/lib/server/domain/imports/matchers/media-matcher.registry";


export class ImportJobProcessor {
    constructor(
        private importService: ImportService,
        private matcherRegistry: typeof MediaMatcherRegistry,
    ) {
    }

    requeueInterruptedJobs() {
        return this.importService.requeueInterruptedJobs();
    }

    async processNextJob() {
        const job = await this.importService.claimNextQueuedJob();
        if (!job) return null;

        return providerRequestContext.run({ isImport: true }, async () => {
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
                if (error instanceof ProviderRequestError && error.details.kind !== "item") {
                    logger.warn({ jobId: job.id, ...error.details }, "Import stopped for provider error");

                    const stoppedJob = error.details.kind === "access"
                        ? await this.importService.markProcessingJobFailed(job.id, error.message)
                        : this.importService.pauseProcessingJob(job.id, error.message, error.details.retryAt!);

                    if (!stoppedJob) throw error;

                    return stoppedJob;
                }
                logger.error({ err: error, jobId: job.id }, "Import processing failed");

                const failedJob = await this.importService.markProcessingJobFailed(job.id,
                    "The import stopped unexpectedly. Entries already imported were kept. Please try importing the file again.");

                if (!failedJob) throw error;

                return failedJob;
            }
        });
    }
}
