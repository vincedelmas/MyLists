import {describe, expect, it} from "vitest";
import {ImportSource} from "@/lib/utils/enums";
import {importUploadSchema} from "@/lib/schemas/imports.schema";


describe("importUploadSchema", () => {
    const file = new File(["csv"], "ratings.csv", { type: "text/csv" });

    it("keeps MyLists uploads valid without a Letterboxd file type", () => {
        expect(importUploadSchema.parse({ source: ImportSource.MYLISTS, file })).toEqual({ source: ImportSource.MYLISTS, file });
    });

    it.each([
        new File([], "ratings.csv"),
        new File(["zip"], "letterboxd.zip", { type: "application/zip" }),
        new File(["csv"], "ratings.csv", { type: "text/html" }),
    ])("rejects empty and non-CSV Letterboxd uploads", invalidFile => {
        expect(importUploadSchema.safeParse({
            source: ImportSource.LETTERBOXD, letterboxdFileType: "ratings", file: invalidFile,
        }).success).toBe(false);
    });

    it.each([
        { source: ImportSource.MYLISTS },
        { source: ImportSource.LETTERBOXD, letterboxdFileType: "ratings" },
        { source: ImportSource.IMDB, imdbFileType: "ratings" },
    ])("accepts exactly 3 MB and rejects larger uploads for $source", sourceOptions => {
        const maxSize = 3 * 1024 * 1024;
        expect(importUploadSchema.safeParse({
            ...sourceOptions, file: new File([new Uint8Array(maxSize)], "ratings.csv"),
        }).success).toBe(true);
        expect(importUploadSchema.safeParse({
            ...sourceOptions, file: new File([new Uint8Array(maxSize + 1)], "ratings.csv"),
        }).success).toBe(false);
    });

});
