import {ImportJobProcessor} from "@/lib/server/domain/imports/import-job.processor";


export interface ImportDrainResult {
    processedJobs: number;
}


export const drainImportJobs = async (processor: ImportJobProcessor): Promise<ImportDrainResult> => {
    let processedJobs = 0;

    while (true) {
        const job = await processor.processNextJob();
        if (!job) break;

        processedJobs += 1;
    }

    return { processedJobs };
};
