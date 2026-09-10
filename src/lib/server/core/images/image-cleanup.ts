import path from "node:path";
import {readdir, stat} from "node:fs/promises";


const IMAGE_CLEANUP_GRACE_MS = 24 * 60 * 60 * 1000;


export const getUnusedImageFiles = async (dirPath: string, getDbFilenames: () => Promise<string[]>) => {
    // Uploads use fresh filenames and write file before saving database ref

    const modifiedBefore = Date.now() - IMAGE_CLEANUP_GRACE_MS;

    const filesOnDisk = await readdir(dirPath);
    const dbFilenames = await getDbFilenames();

    const unusedFiles: string[] = [];
    const dbSetFilenames = new Set(dbFilenames);

    for (const filename of filesOnDisk) {
        if (filename === "default.jpg" || dbSetFilenames.has(filename)) {
            continue;
        }

        try {
            const file = await stat(path.join(dirPath, filename));
            if (file.isFile() && file.mtimeMs < modifiedBefore) {
                unusedFiles.push(filename);
            }
        }
        catch (error) {
            // Another cleanup may have removed file since dir snapshot
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
    }

    return {
        unusedFiles,
        onDiskCount: filesOnDisk.length,
        referencedCount: dbFilenames.length,
    };
};
