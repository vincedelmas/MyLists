import {z} from "zod";
import path from "path";
import * as fs from "fs";
import {serverEnv} from "@/env/server";
import {MediaType} from "@/lib/utils/enums";
import {getContainer} from "@/lib/server/core/container";
import {defineTask} from "@/lib/server/tasks/define-task";


export const removeUnusedMediaCoversTask = defineTask({
    name: "remove-unused-media-covers" as const,
    visibility: "admin",
    description: "Delete cover files not referenced in db",
    inputSchema: z.object({
        dryRun: z.boolean().optional().describe("Log files to delete without actually deleting"),
        mediaTypes: z.array(z.enum(MediaType)).optional().describe("Media types to clean (all if omitted)"),
    }),
    handler: async (ctx, input) => {
        const container = await getContainer();
        const mediaRegistry = container.registries.mediaService;
        const baseUploadsLocation = serverEnv.BASE_UPLOADS_LOCATION;

        const mediaTypes = input.mediaTypes;
        const typesToProcess = mediaTypes && mediaTypes.length > 0 ? mediaTypes : Object.values(MediaType);

        for (const mediaType of typesToProcess) {
            await ctx.step(`cleanup-${mediaType}`, async () => {
                const coversDirectoryPath = path.isAbsolute(baseUploadsLocation)
                    ? path.join(baseUploadsLocation, `${mediaType}-covers`)
                    : path.join(process.cwd(), baseUploadsLocation, `${mediaType}-covers`);

                if (!fs.existsSync(coversDirectoryPath)) {
                    ctx.warn(`Directory not found for ${mediaType}`, { path: coversDirectoryPath });
                    ctx.metric(`${mediaType}.status`, "dir_missing");
                    return;
                }

                const mediaService = mediaRegistry.get(mediaType);
                const dbCoverFilenames = await mediaService.getCoverFilenames();
                const dbCustomCoverFilenames = await mediaService.getCustomCoverFilenames();
                const dbCoverSet = new Set([...dbCoverFilenames, ...dbCustomCoverFilenames]);

                const filesOnDisk = await fs.promises.readdir(coversDirectoryPath);

                ctx.metric(`${mediaType}.on_disk`, filesOnDisk.length);
                ctx.metric(`${mediaType}.in_db`, dbCoverFilenames.length);

                const coversToDelete = filesOnDisk.filter((f) => !dbCoverSet.has(f) && f !== "default.jpg");
                ctx.metric(`${mediaType}.unused_found`, coversToDelete.length);
                if (coversToDelete.length === 0) {
                    return;
                }

                if (input.dryRun) {
                    ctx.info(`Dry run: would delete ${coversToDelete.length} files for ${mediaType}`);
                    ctx.metric(`${mediaType}.dry_run_pending`, coversToDelete.length);
                    return;
                }

                for (const cover of coversToDelete) {
                    const filePath = path.join(coversDirectoryPath, cover);
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
