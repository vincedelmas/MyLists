import {describe, expect, it} from "vitest";
import {Status} from "@/lib/utils/enums";
import {
    changeBookStatus,
    createInitialBookProgress,
    importBookProgress,
    reconcileBookPages,
    replaceBookPage,
    replaceBookRereads,
} from "./book-progress";


describe("book progress", () => {
    it("initializes completed and planned entries from catalog pages", () => {
        expect(createInitialBookProgress(Status.COMPLETED, 412)).toEqual({
            status: Status.COMPLETED,
            currentPage: 412,
            rereadCount: 0,
            totalPagesRead: 412,
        });
        expect(createInitialBookProgress(Status.PLAN_TO_READ, 412)).toEqual({
            status: Status.PLAN_TO_READ,
            currentPage: 0,
            rereadCount: 0,
            totalPagesRead: 0,
        });
    });

    it("preserves explicit import drift instead of deriving historical totals", () => {
        expect(importBookProgress(Status.COMPLETED, 414, 5, 2_484)).toEqual({
            status: Status.COMPLETED,
            currentPage: 414,
            rereadCount: 5,
            totalPagesRead: 2_484,
        });
    });

    it("matches current status reset and completion behavior", () => {
        const current = importBookProgress(Status.READING, 80, 2, 280);
        expect(changeBookStatus(current, Status.COMPLETED, 100)).toEqual({
            status: Status.COMPLETED,
            currentPage: 100,
            rereadCount: 2,
            totalPagesRead: 100,
        });
        expect(changeBookStatus(current, Status.PLAN_TO_READ, 100)).toEqual({
            status: Status.PLAN_TO_READ,
            currentPage: 0,
            rereadCount: 0,
            totalPagesRead: 0,
        });
    });

    it("matches current page and reread replacement formulas", () => {
        const current = importBookProgress(Status.READING, 50, 1, 150);
        expect(replaceBookPage(current, 80, 100)).toMatchObject({ currentPage: 80, totalPagesRead: 180 });
        expect(replaceBookRereads(current, 2, 100)).toMatchObject({
            currentPage: 50,
            rereadCount: 2,
            totalPagesRead: 300,
        });
    });

    it("reconciles completed and in-progress entries when catalog pages change", () => {
        expect(reconcileBookPages(importBookProgress(Status.COMPLETED, 400, 1, 800), 412)).toEqual({
            status: Status.COMPLETED,
            currentPage: 412,
            rereadCount: 1,
            totalPagesRead: 824,
        });
        expect(reconcileBookPages(importBookProgress(Status.READING, 450, 2, 1_250), 300)).toEqual({
            status: Status.READING,
            currentPage: 300,
            rereadCount: 2,
            totalPagesRead: 900,
        });
    });

    it("rejects family-invalid status and runtime page overflow", () => {
        expect(() => createInitialBookProgress(Status.WATCHING, 100)).toThrow("Status is not valid for books");
        const current = createInitialBookProgress(Status.READING, 100);
        expect(() => replaceBookPage(current, 101, 100)).toThrow("Invalid page");
        expect(() => replaceBookRereads(current, 101, 100)).toThrow("cannot be re-read more than 100 times");
    });
});
