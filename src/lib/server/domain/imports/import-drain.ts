import {ImportJobStatus} from "@/lib/utils/enums";
import {ImportJobProcessor} from "@/lib/server/domain/imports/import-job.processor";


export const drainImportJobs = async (processor: ImportJobProcessor) => {
    let failedJobs = 0;
    let processedJobs = 0;
    const userIds = new Set<number>();

    while (true) {
        const job = await processor.processNextJob();
        if (!job) break;
        userIds.add(job.userId);

        if (job.status === ImportJobStatus.FAILED) failedJobs += 1;
        else processedJobs += 1; // Paused attempts can have added entries and also need statistics recomputed.
    }

    return { failedJobs, processedJobs, userIds: [...userIds] };
};
