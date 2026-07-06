import {importUploadSchema} from "@/lib/schemas";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";


export const postCreateImportJob = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator((data) => importUploadSchema.parse(data instanceof FormData ? Object.fromEntries(data.entries()) : data))
    .handler(async ({ data: { file, source }, context: { currentUser } }) => {
        const container = await getContainer();
        const importService = container.services.imports;
        const job = await importService.createImportJob(currentUser.id, source, await file.text());

        return {
            jobId: job.id,
            error: job.error,
            status: job.status,
            totalCount: job.totalCount,
            failedCount: job.failedCount,
            skippedCount: job.skippedCount,
            completedCount: job.completedCount,
            processedCount: job.processedCount,
        };
    });
