import {z} from "zod";
import path from "path";
import * as fs from "fs";
import {serverEnv} from "@/env/server";
import {getContainer} from "@/lib/server/core/container";
import {defineTask} from "@/lib/server/tasks/define-task";
import {getUnusedImageFiles} from "@/lib/server/core/images/image-cleanup";


export const removeUnusedProfileImagesTask = defineTask({
    name: "remove-unused-profile-images" as const,
    visibility: "admin",
    description: "Delete profile and background image files not referenced in db",
    inputSchema: z.object({
        dryRun: z.boolean().optional().describe("Log files to delete without actually deleting"),
    }),
    handler: async (ctx, input) => {
        const container = await getContainer();
        const profileService = container.services.profile;
        const baseUploadsLocation = serverEnv.BASE_UPLOADS_LOCATION;

        const cleanupSteps = [
            {
                name: "profile-covers",
                getDbFilenames: () => profileService.getProfileImageFilenames(),
            },
            {
                name: "profile-back-covers",
                getDbFilenames: () => profileService.getBackgroundImageFilenames(),
            }
        ];

        for (const step of cleanupSteps) {
            await ctx.step(`cleanup-${step.name}`, async () => {
                const dirPath = path.isAbsolute(baseUploadsLocation)
                    ? path.join(baseUploadsLocation, step.name)
                    : path.join(process.cwd(), baseUploadsLocation, step.name);

                if (!fs.existsSync(dirPath)) {
                    ctx.warn(`Directory not found for ${step.name}`, { path: dirPath });
                    ctx.metric(`${step.name}.status`, "dir_missing");
                    return;
                }

                const { onDiskCount, referencedCount, unusedFiles } = await getUnusedImageFiles(dirPath, step.getDbFilenames);

                ctx.metric(`${step.name}.on_disk`, onDiskCount);
                ctx.metric(`${step.name}.in_db`, referencedCount);

                ctx.metric(`${step.name}.unused_found`, unusedFiles.length);
                if (unusedFiles.length === 0) {
                    return;
                }

                if (input.dryRun) {
                    ctx.info(`Dry run: would delete ${unusedFiles.length} files for ${step.name}`);
                    ctx.metric(`${step.name}.dry_run_pending`, unusedFiles.length);
                    return;
                }

                let deletedCount = 0;
                for (const file of unusedFiles) {
                    const filePath = path.join(dirPath, file);
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
