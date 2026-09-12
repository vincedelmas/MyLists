import {ImportJobProcessor} from "@/lib/server/domain/imports/import-job.processor";
import {ImportJobStatus} from "@/lib/utils/enums";


const STALE_PROCESSING_JOB_MINUTES = 6 * 60;


export const drainImportJobs = async (processor: ImportJobProcessor) => {
    let failedJobs = 0;
    let processedJobs = 0;

    await processor.requeueStaleProcessingJobs(STALE_PROCESSING_JOB_MINUTES);

    while (true) {
        const job = await processor.processNextJob();
        if (!job) break;

        if (job.status === ImportJobStatus.FAILED) failedJobs += 1;
        else processedJobs += 1;
    }

    return { failedJobs, processedJobs };
};
