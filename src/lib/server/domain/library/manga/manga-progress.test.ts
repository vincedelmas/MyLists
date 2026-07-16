import {describe, expect, it} from "vitest";
import {Status} from "@/lib/utils/enums";
import {
    changeMangaStatus,
    createInitialMangaProgress,
    importMangaProgress,
    replaceMangaChapter,
    replaceMangaRereads,
} from "./manga-progress";


describe("manga progress", () => {
    it("preserves publishing-series chapter progress when the final length is unknown", () => {
        const reading = createInitialMangaProgress(Status.READING, null);
        expect(replaceMangaChapter(reading, 1_256, null)).toEqual({
            status: Status.READING,
            currentChapter: 1_256,
            rereadCount: 0,
            totalChaptersRead: 1_256,
        });
        expect(() => changeMangaStatus(reading, Status.COMPLETED, null)).toThrow(/without chapters/);
        expect(() => replaceMangaRereads(reading, 1, null)).toThrow(/without chapters/);
    });

    it("keeps the legacy status and reread transition behavior for known lengths", () => {
        const reread = replaceMangaRereads({
            status: Status.COMPLETED,
            currentChapter: 201,
            rereadCount: 0,
            totalChaptersRead: 201,
        }, 2, 201);
        expect(reread).toEqual({
            status: Status.COMPLETED,
            currentChapter: 201,
            rereadCount: 2,
            totalChaptersRead: 603,
        });
        expect(changeMangaStatus(reread, Status.COMPLETED, 201)).toEqual({
            status: Status.COMPLETED,
            currentChapter: 201,
            rereadCount: 2,
            totalChaptersRead: 201,
        });
        expect(changeMangaStatus(reread, Status.PLAN_TO_READ, 201)).toEqual({
            status: Status.PLAN_TO_READ,
            currentChapter: 0,
            rereadCount: 0,
            totalChaptersRead: 0,
        });
    });

    it("imports explicit historical totals without deriving them from mutable metadata", () => {
        expect(importMangaProgress(Status.COMPLETED, 19, 1, 38)).toEqual({
            status: Status.COMPLETED,
            currentChapter: 19,
            rereadCount: 1,
            totalChaptersRead: 38,
        });
    });
});
