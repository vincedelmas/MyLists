import {ImportSource} from "@/lib/utils/enums";
import {ImportParserRegistry} from "@/lib/types/imports.types";
import {withTransaction} from "@/lib/server/database/async-storage";
import {ImportRepository} from "@/lib/server/domain/imports/import.repository";
import {parseMyListsCsv} from "@/lib/server/domain/imports/parsers/mylists.parser";


const importParserRegistry: ImportParserRegistry = {
    [ImportSource.MYLISTS]: parseMyListsCsv,
};


export class ImportService {
    constructor(
        private repository: typeof ImportRepository,
        private parsers: ImportParserRegistry = importParserRegistry,
    ) {
    }

    async createImportJob(userId: number, source: ImportSource, contents: string) {
        const job = await this.repository.createJob(userId, source);

        try {
            const parser = this.parsers[source];
            if (!parser) {
                throw new Error(`Import source "${source}" is not supported yet`);
            }

            const parsed = parser(contents);
            const queuedJob = await withTransaction(async () => {
                await this.repository.insertParsedItems(job.id, parsed.items);
                return this.repository.markJobQueued(job.id, parsed.totalCount, parsed.failedCount);
            });

            if (!queuedJob) {
                throw new Error(`Import job ${job.id} is no longer in parsing state`);
            }

            return queuedJob;
        }
        catch (error) {
            const errorMessage = error instanceof Error
                ? String(error.message) :
                "The import could not be parsed due to an internal error";

            const failedJob = await this.repository.markJobFailed(job.id, errorMessage);
            if (failedJob) return failedJob;

            throw error;
        }
    }
}
