import path from "node:path";
import {tmpdir} from "node:os";
import {mkdir, mkdtemp, rm, utimes, writeFile} from "node:fs/promises";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {getUnusedImageFiles} from "@/lib/server/core/images/image-cleanup";


const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date("2026-09-10T12:00:00Z");
const old = new Date(now.getTime() - 2 * DAY_MS);
let directoryPath: string;

const writeImage = async (filename: string, modifiedAt = now) => {
    const filePath = path.join(directoryPath, filename);
    await writeFile(filePath, "image");
    await utimes(filePath, modifiedAt, modifiedAt);
};


beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    directoryPath = await mkdtemp(path.join(tmpdir(), "mylists-image-cleanup-"));
});

afterEach(async () => {
    vi.useRealTimers();
    await rm(directoryPath, { recursive: true, force: true });
});


describe("getUnusedImageFiles", () => {
    it("only selects old unreferenced files, preserving defaults and recent uploads", async () => {
        await Promise.all([
            writeImage("referenced.jpg", old),
            writeImage("default.jpg", old),
            writeImage("orphan.jpg", old),
            writeImage("pending-upload.jpg"),
            writeImage("at-grace-boundary.jpg", new Date(now.getTime() - DAY_MS)),
        ]);
        const subdirectory = path.join(directoryPath, "subdirectory");
        await mkdir(subdirectory);
        await utimes(subdirectory, old, old);

        const result = await getUnusedImageFiles(directoryPath, async () => ["referenced.jpg"]);

        expect(result).toEqual({ unusedFiles: ["orphan.jpg"], onDiskCount: 6, referencedCount: 1 });
    });

    it("excludes files added while reading database references, even with an old modification time", async () => {
        const committedFilenames: string[] = [];

        const result = await getUnusedImageFiles(directoryPath, async () => {
            const snapshot = [...committedFilenames];
            await writeImage("concurrent-upload.jpg", old);
            committedFilenames.push("concurrent-upload.jpg");
            return snapshot;
        });

        expect(result.unusedFiles).toEqual([]);
        expect(result.onDiskCount).toBe(0);
        expect(committedFilenames).toEqual(["concurrent-upload.jpg"]);
    });

});
