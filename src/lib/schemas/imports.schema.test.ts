import {describe, expect, it} from "vitest";
import {ImportSource} from "@/lib/utils/enums";
import {importUploadSchema} from "@/lib/schemas/imports.schema";


describe("importUploadSchema", () => {
    const file = new File(["csv"], "ratings.csv", { type: "text/csv" });

    it("keeps MyLists uploads valid without a Letterboxd file type", () => {
        expect(importUploadSchema.parse({ source: ImportSource.MYLISTS, file })).toEqual({ source: ImportSource.MYLISTS, file });
    });

    it.each(["ratings", "watched", "watchlist"])("accepts Letterboxd %s uploads from form data", letterboxdFileType => {
        const formData = new FormData();
        formData.set("source", ImportSource.LETTERBOXD);
        formData.set("letterboxdFileType", letterboxdFileType);
        formData.set("file", file);
        expect(importUploadSchema.parse(Object.fromEntries(formData.entries()))).toMatchObject({
            source: ImportSource.LETTERBOXD, letterboxdFileType,
        });
    });

    it.each([undefined, "diary", ""])("rejects missing or unsupported Letterboxd file type %j", letterboxdFileType => {
        expect(importUploadSchema.safeParse({ source: ImportSource.LETTERBOXD, letterboxdFileType, file }).success).toBe(false);
    });

    it.each([
        new File([], "ratings.csv"),
        new File(["zip"], "letterboxd.zip", { type: "application/zip" }),
        new File(["csv"], "ratings.csv", { type: "text/html" }),
        new File([new Uint8Array(5 * 1024 * 1024 + 1)], "ratings.csv"),
    ])("rejects empty, non-CSV, and oversized Letterboxd uploads", invalidFile => {
        expect(importUploadSchema.safeParse({
            source: ImportSource.LETTERBOXD, letterboxdFileType: "ratings", file: invalidFile,
        }).success).toBe(false);
    });

    it.each([ImportSource.IMDB, ImportSource.TMDB])("keeps unsupported source %s disabled", source => {
        expect(importUploadSchema.safeParse({ source, file }).success).toBe(false);
    });
});
