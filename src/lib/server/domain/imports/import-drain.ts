import {ImportJobProcessingError, ImportJobProcessor} from "@/lib/server/domain/imports/import-job.processor";


const STALE_PROCESSING_JOB_MINUTES = 6 * 60;


export type ImportDrainResult = {
    failedJobs: number;
    processedJobs: number;
};


export const drainImportJobs = async (
    processor: ImportJobProcessor,
    options: { signal?: AbortSignal } = {},
): Promise<ImportDrainResult> => {
    let failedJobs = 0;
    let processedJobs = 0;

    await processor.requeueStaleProcessingJobs(STALE_PROCESSING_JOB_MINUTES);

    while (!options.signal?.aborted) {
        try {
            const job = await processor.processNextJob();
            if (!job) break;

            processedJobs += 1;
        }
        catch (error) {
            if (!(error instanceof ImportJobProcessingError)) throw error;
            failedJobs += 1;
        }
    }

    return { failedJobs, processedJobs };
};
