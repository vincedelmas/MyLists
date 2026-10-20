import {describe, expect, it, vi} from "vitest";
import type {Book, BooksList} from "./books.types";
import {RatingSystemType, Status} from "@/lib/utils/enums";
import type {UserMediaWithTags} from "@/lib/types/user-media.types";
import {createBooksService} from "@/lib/server/domain/media/books/books.service";
import type {BooksRepository} from "@/lib/server/domain/media/books/books.repository";
import {createListTableStub, createRepoStub} from "@/lib/server/domain/media/service-test-utils";

vi.mock("@/lib/server/database/async-storage", () => ({
    withTransaction: <T>(action: () => T) => action(),
}));


describe("BooksService", () => {
    const booksRepository = createRepoStub({ listTable: createListTableStub() }) as unknown as BooksRepository;
    const booksService = createBooksService(booksRepository);

    const TIME_PER_PAGE = 1.7;

    const baseBook: Book = {
        id: 1,
        name: "Test Book",
        imageCover: "test.jpg",
        releaseDate: "2025-01-01",
        synopsis: "A test book.",
        apiId: "123",
        lockStatus: true,
        addedAt: new Date().toISOString(),
        lastApiUpdate: new Date().toISOString(),
        pages: 100,
        language: "en",
        publishers: "Test Publisher",
    };

    const makeState = (overrides: Partial<BooksList>): BooksList => ({
        id: 1,
        userId: 1,
        mediaId: 1,
        status: Status.COMPLETED,
        rating: null,
        comment: null,
        favorite: false,
        addedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        customCover: null,
        releaseNotificationsEnabled: true,
        redo: 0,
        total: 100,
        actualPage: 100,
        ...overrides,
    });

    const makeUserState = (overrides: Partial<UserMediaWithTags<BooksList>>): UserMediaWithTags<BooksList> => ({
        ...makeState(overrides),
        tags: [],
        ratingSystem: RatingSystemType.SCORE,
    });

    describe("calculateDeltaStats", () => {
        it("should calculate delta when adding new book", () => {
            const delta = booksService.calculateDeltaStats(null, makeState({}), baseBook);

            expect(delta.totalEntries).toBe(1);
            expect(delta.entriesRated).toBe(0);
            expect(delta.entriesFavorites).toBe(0);
            expect(delta.timeSpent).toBeCloseTo(100 * TIME_PER_PAGE);
            expect(delta.statusCounts?.[Status.COMPLETED]).toBe(1);
        });

        it("should calculate delta when removing book", () => {
            const old = makeUserState({ favorite: true, rating: 8, comment: "Great" });
            const delta = booksService.calculateDeltaStats(old, null, baseBook);

            expect(delta.totalEntries).toBe(-1);
            expect(delta.entriesFavorites).toBe(-1);
            expect(delta.timeSpent).toBeCloseTo(-(100 * TIME_PER_PAGE));
            expect(delta.statusCounts?.[Status.COMPLETED]).toBe(-1);
        });

    });

    describe("updateHandlers", () => {
        it("completes the last page while counting a reread only once", () => {
            const current = makeUserState({ status: Status.READING, actualPage: 95, total: 195, redo: 1 });
            const [next, log] = booksService.updatePageHandler(current, { actualPage: 100 }, baseBook);
            expect(next).toMatchObject({ status: Status.COMPLETED, actualPage: 100, total: 200, redo: 1 });
            expect(log).toEqual({ oldValue: 95, newValue: 100 });
            expect(booksService.calculateDeltaStats(current, next, baseBook)).toMatchObject({
                totalSpecific: 5,
                statusCounts: { [Status.READING]: -1, [Status.COMPLETED]: 1 },
            });
        });

        it("updateStatusHandler: COMPLETED -> PTR set total, redo and actualPage = 0", () => {
            const current = makeState({ status: Status.COMPLETED, redo: 4, total: 500, actualPage: 100 });
            const [next, log] = booksService.updateStatusHandler(current, { status: Status.PLAN_TO_READ }, baseBook);

            expect(next.redo).toBe(0);
            expect(next.total).toBe(0);
            expect(next.actualPage).toBe(0);
            expect(next.status).toBe(Status.PLAN_TO_READ);
            expect(log?.oldValue).toBe(Status.COMPLETED);
            expect(log?.newValue).toBe(Status.PLAN_TO_READ);
        });

        it.each([{ redo: 0, total: 50 }, { redo: 2, total: 250 }])(
            "preserves partial progress when changing rereads to $redo", ({ redo, total }) => {
                const current = makeState({ status: Status.READING, actualPage: 50, redo: 1, total: 150 });
                const [reread, log] = booksService.updateRedoHandler(current, { redo }, baseBook);

                expect(reread).toMatchObject({ status: Status.READING, actualPage: 50, redo, total });
                expect(log).toEqual({ oldValue: 1, newValue: redo });

                const [nextPage] = booksService.updatePageHandler(reread, { actualPage: 51 }, baseBook);
                expect(nextPage.total).toBe(total + 1);

                const delta = booksService.calculateDeltaStats(makeUserState(reread), nextPage, baseBook);
                expect(delta.totalSpecific).toBe(1);
                expect(delta.timeSpent).toBeCloseTo(TIME_PER_PAGE);
            },
        );

    });
});
