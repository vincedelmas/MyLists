import {z} from "zod";
import path from "path";
import * as fs from "fs";
import {serverEnv} from "@/env/server";
import {getContainer} from "@/lib/server/core/container";
import {defineTask} from "@/lib/server/tasks/define-task";


export const removeUnusedProfileImagesTask = defineTask({
    name: "remove-unused-profile-images" as const,
    visibility: "admin",
    description: "Delete profile and background image files not referenced in db",
    inputSchema: z.object({
        dryRun: z.boolean().optional().describe("Log files to delete without actually deleting"),
    }),
    handler: async (ctx, input) => {
        const container = await getContainer();
        const accountQuery = container.account.query;
        const baseUploadsLocation = serverEnv.BASE_UPLOADS_LOCATION;

        const cleanupSteps = [{
            name: "profile-covers",
            getDbFilenames: () => accountQuery.getProfileImageFilenames(),
        }, {
            name: "profile-back-covers",
            getDbFilenames: () => accountQuery.getBackgroundImageFilenames(),
        }];

        for (const step of cleanupSteps) {
            await ctx.step(`cleanup-${step.name}`, async () => {
                const directoryPath = path.isAbsolute(baseUploadsLocation)
                    ? path.join(baseUploadsLocation, step.name)
                    : path.join(process.cwd(), baseUploadsLocation, step.name);

                if (!fs.existsSync(directoryPath)) {
                    ctx.warn(`Directory not found for ${step.name}`, { path: directoryPath });
                    ctx.metric(`${step.name}.status`, "dir_missing");
                    return;
                }

                const dbFilenames = await step.getDbFilenames();
                const dbSet = new Set(dbFilenames);
                const filesOnDisk = await fs.promises.readdir(directoryPath);

                ctx.metric(`${step.name}.on_disk`, filesOnDisk.length);
                ctx.metric(`${step.name}.in_db`, dbFilenames.length);

                const filesToDelete = filesOnDisk.filter((f) => !dbSet.has(f) && f !== "default.jpg");
                ctx.metric(`${step.name}.unused_found`, filesToDelete.length);
                if (filesToDelete.length === 0) {
                    return;
                }

                if (input.dryRun) {
                    ctx.info(`Dry run: would delete ${filesToDelete.length} files for ${step.name}`);
                    ctx.metric(`${step.name}.dry_run_pending`, filesToDelete.length);
                    return;
                }

                let deletedCount = 0;
                for (const file of filesToDelete) {
                    const filePath = path.join(directoryPath, file);
                    try {
                        await fs.promises.unlink(filePath);
                        ctx.increment(`${step.name}.deleted`);
                        deletedCount += 1;
                    }
                    catch (err) {
                        ctx.increment(`${step.name}.failed`);
                        ctx.error(`Failed to delete file: ${file}`, {
                            error: err instanceof Error ? err.message : String(err)
                        });
                    }
                }

                ctx.info(`Finished cleanup for ${step.name}. Deleted ${deletedCount} files.`);
            });
        }
    },
});
