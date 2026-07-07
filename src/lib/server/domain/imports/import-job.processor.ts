import {ImportService} from "@/lib/server/domain/imports/import.service";
import {ImportMatcherItem} from "@/lib/types/imports.types";
import {MediaMatcherRegistry} from "@/lib/server/domain/imports/matchers/media-matcher.registry";


export class ImportJobProcessor {
    constructor(
        private importService: ImportService,
        private matcherRegistry: MediaMatcherRegistry,
    ) {
    }

    async processNextJob() {
        const job = await this.importService.claimNextQueuedJob();
        if (!job) return null;

        const context = { jobId: job.id, userId: job.userId };
        const groups = await this.importService.getQueuedItemsByMediaType(job.id);

        for (const [mediaType, queuedItems] of groups) {
            const matcherItems = queuedItems.map((item) => ({ ...item, mediaType }));
            const processingItems = await this._markGroupProcessing(job.id, matcherItems);
            if (processingItems.length === 0) continue;

            const matcher = this.matcherRegistry.get(mediaType);
            for await (const outcomes of matcher.match(context, processingItems)) {
                await this.importService.applyItemOutcomes(job.id, outcomes);
            }
        }

        return this.importService.finalizeProcessingJob(job.id);
    }

    private async _markGroupProcessing(jobId: number, queuedItems: ImportMatcherItem[]) {
        const markedItems = await this.importService.markItemsProcessing(jobId, queuedItems.map(item => item.id));
        const markedIds = new Set(markedItems.map(item => item.id));

        return queuedItems.filter(item => markedIds.has(item.id));
    }
}
