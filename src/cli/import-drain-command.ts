import {getContainer} from "@/lib/server/core/container";
import {drainImportJobs} from "@/lib/server/domain/imports/import-drain";


export const runImportDrainCommand = async () => {
    const container = await getContainer();
    const result = await drainImportJobs(container.services.importProcessor);

    console.log(`Import drain finished. Processed jobs: ${result.processedJobs}`);

    return result;
};
