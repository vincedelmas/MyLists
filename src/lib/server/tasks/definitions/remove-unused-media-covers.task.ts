import {z} from "zod";
import path from "path";
import * as fs from "fs";
import {serverEnv} from "@/env/server";
import {MediaType} from "@/lib/utils/enums";
import {defineTask} from "@/lib/server/tasks/define-task";
import {getUnusedImageFiles} from "@/lib/server/core/images/image-cleanup";
import {MediaMaintenanceRepository} from "@/lib/server/domain/maintenance/media-maintenance.repository";


export const removeUnusedMediaCoversTask = defineTask({
    name: "remove-unused-media-covers" as const,
    visibility: "admin",
    description: "Delete cover files not referenced in db",
    inputSchema: z.object({
        dryRun: z.boolean().optional().describe("Log files to delete without actually deleting"),
        mediaTypes: z.array(z.enum(MediaType)).optional().describe("Media types to clean (all if omitted)"),
    }),
    handler: async (ctx, input) => {
        const baseUploadsLocation = serverEnv.BASE_UPLOADS_LOCATION;

        const mediaTypes = input.mediaTypes;
        const typesToProcess = mediaTypes && mediaTypes.length > 0 ? mediaTypes : Object.values(MediaType);

        for (const mediaType of typesToProcess) {
            await ctx.step(`cleanup-${mediaType}`, async () => {
                const dirPath = path.isAbsolute(baseUploadsLocation)
                    ? path.join(baseUploadsLocation, `${mediaType}-covers`)
                    : path.join(process.cwd(), baseUploadsLocation, `${mediaType}-covers`);

                if (!fs.existsSync(dirPath)) {
                    ctx.warn(`Directory not found for ${mediaType}`, { path: dirPath });
                    ctx.metric(`${mediaType}.status`, "dir_missing");
                    return;
                }

                const { unusedFiles, onDiskCount, referencedCount } = await getUnusedImageFiles(dirPath, async () => {
                    const dbCoverFilenames = await MediaMaintenanceRepository.getCoverFilenames(mediaType);
                    const dbCustomCoverFilenames = await MediaMaintenanceRepository.getCustomCoverFilenames(mediaType);
                    return [...dbCoverFilenames, ...dbCustomCoverFilenames];
                });

                ctx.metric(`${mediaType}.on_disk`, onDiskCount);
                ctx.metric(`${mediaType}.in_db`, referencedCount);

                ctx.metric(`${mediaType}.unused_found`, unusedFiles.length);
                if (unusedFiles.length === 0) {
                    return;
                }

                if (input.dryRun) {
                    ctx.info(`Dry run: would delete ${unusedFiles.length} files for ${mediaType}`);
                    ctx.metric(`${mediaType}.dry_run_pending`, unusedFiles.length);
                    return;
                }

                for (const cover of unusedFiles) {
                    const filePath = path.join(dirPath, cover);
                    try {
                        await fs.promises.unlink(filePath);
                        ctx.increment(`${mediaType}.deleted`);
                    }
                    catch (err) {
                        ctx.increment(`${mediaType}.failed`);
                        ctx.error(`Failed to delete cover: ${cover}`, {
                            error: err instanceof Error ? err.message : String(err)
                        });
                    }
                }

                // @ts-expect-error: metric type is finicky
                const deletedCount = (ctx.metric[`${mediaType}.deleted`] as number) || 0;
                ctx.info(`Finished cleanup for ${mediaType}. Deleted ${deletedCount} files.`);
            });
        }
    },
});
