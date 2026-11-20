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
        customTitle: "Test Book",
        customPages: 100,
        customPublisher: "Test Publisher",
        customReleaseDate: "2025-01-01",
        customLanguage: "en",
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
            const current = makeUserState({ status: Status.IN_PROGRESS, actualPage: 95, total: 195, redo: 1 });
            const [next, log] = booksService.updatePageHandler(current, { actualPage: 100 }, baseBook);
            expect(next).toMatchObject({ status: Status.COMPLETED, actualPage: 100, total: 200, redo: 1 });
            expect(log).toEqual({ oldValue: 95, newValue: 100 });
            expect(booksService.calculateDeltaStats(current, next, baseBook)).toMatchObject({
                totalSpecific: 5,
                statusCounts: { [Status.IN_PROGRESS]: -1, [Status.COMPLETED]: 1 },
            });
        });

        it("updateStatusHandler: COMPLETED -> PLANNED set total, redo and actualPage = 0", () => {
            const current = makeState({ status: Status.COMPLETED, redo: 4, total: 500, actualPage: 100 });
            const [next, log] = booksService.updateStatusHandler(current, { status: Status.PLANNED }, baseBook);

            expect(next.redo).toBe(0);
            expect(next.total).toBe(0);
            expect(next.actualPage).toBe(0);
            expect(next.status).toBe(Status.PLANNED);
            expect(log?.oldValue).toBe(Status.COMPLETED);
            expect(log?.newValue).toBe(Status.PLANNED);
        });

        it.each([{ redo: 0, total: 50 }, { redo: 2, total: 250 }])(
            "preserves partial progress when changing rereads to $redo", ({ redo, total }) => {
                const current = makeState({ status: Status.IN_PROGRESS, actualPage: 50, redo: 1, total: 150 });
                const [reread, log] = booksService.updateRedoHandler(current, { redo }, baseBook);

                expect(reread).toMatchObject({ status: Status.IN_PROGRESS, actualPage: 50, redo, total });
                expect(log).toEqual({ oldValue: 1, newValue: redo });

                const [nextPage] = booksService.updatePageHandler(reread, { actualPage: 51 }, baseBook);
                expect(nextPage.total).toBe(total + 1);

                const delta = booksService.calculateDeltaStats(makeUserState(reread), nextPage, baseBook);
                expect(delta.totalSpecific).toBe(1);
                expect(delta.timeSpent).toBeCloseTo(TIME_PER_PAGE);
            },
        );

        it("uses customPages instead of parent book pages for progress and completion", () => {
            const current = makeUserState({ status: Status.IN_PROGRESS, customPages: 320, actualPage: 300, redo: 1, total: 620 });
            const [next] = booksService.updatePageHandler(current, { actualPage: 320 }, baseBook);
            expect(next).toMatchObject({ status: Status.COMPLETED, actualPage: 320, total: 640 });
            expect(() => booksService.updatePageHandler(current, { actualPage: 321 }, baseBook)).toThrow("Invalid page");
        });

    });

    describe("updateUserCustomDetails", () => {
        it("rejects lowering customPages below actualPage for an in-progress book", () => {
            const repo = {
                ...booksRepository,
                findById: () => baseBook,
                findUserMedia: () => makeUserState({ status: Status.IN_PROGRESS, actualPage: 80, customPages: 100, total: 80 }),
            } as unknown as BooksRepository;
            const service = createBooksService(repo);

            expect(() => service.updateUserCustomDetails(1, {
                mediaId: 1,
                customTitle: "My Edition",
                customPages: 50,
                customPublisher: null,
                customReleaseDate: null,
                customLanguage: "fr",
            })).toThrow("Total pages cannot be less than your current page (80).");
        });

        it("recalculates actualPage, total, and stats delta when changing customPages on a completed book", () => {
            const current = makeUserState({ status: Status.COMPLETED, actualPage: 100, customPages: 100, redo: 1, total: 200 });
            let updatedValues: Partial<BooksList> = {};
            const repo = {
                ...booksRepository,
                findById: () => baseBook,
                findUserMedia: () => current,
                updateUserMediaDetails: (_userId: number, _mediaId: number, data: Partial<BooksList>) => {
                    updatedValues = data;
                    return { ...current, ...data };
                },
            } as unknown as BooksRepository;
            const service = createBooksService(repo);

            const result = service.updateUserCustomDetails(1, {
                mediaId: 1,
                customTitle: "French Edition",
                customPages: 150,
                customPublisher: "Gallimard",
                customReleaseDate: "2020-05-01",
                customLanguage: "fr",
            });

            expect(updatedValues).toMatchObject({
                customTitle: "French Edition",
                customPages: 150,
                actualPage: 150,
                total: 300,
                customPublisher: "Gallimard",
                customLanguage: "fr",
            });
            expect(result.delta.totalSpecific).toBe(100);
            expect(result.delta.timeSpent).toBeCloseTo(100 * TIME_PER_PAGE);
        });
    });
});
