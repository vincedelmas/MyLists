import {ImportJobProcessor} from "@/lib/server/domain/imports/import-job.processor";


export const drainImportJobs = async (processor: ImportJobProcessor) => {
    let failedJobs = 0;
    let processedJobs = 0;

    while (true) {
        try {
            const job = await processor.processNextJob();
            if (!job) break;

            processedJobs += 1;
        }
        catch {
            failedJobs += 1;
        }
    }

    return { failedJobs, processedJobs };
};
