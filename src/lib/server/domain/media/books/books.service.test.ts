import {describe, expect, it, vi} from "vitest";
import type {Book, BooksList} from "./books.types";
import {RatingSystemType, Status, UpdateType} from "@/lib/utils/enums";
import type {UserMediaWithTags} from "@/lib/types/user-media.types";
import {createBooksService} from "@/lib/server/domain/media/books/books.service";
import type {BooksRepository} from "@/lib/server/domain/media/books/books.repository";
import {createListTableStub, createRepoStub} from "@/lib/server/domain/media/service-test-utils";


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

    it.each([
        { payload: { type: UpdateType.STATUS, status: Status.PLAN_TO_READ }, state: { total: 0, actualPage: 0 }, totalDelta: -100 },
        { payload: { type: UpdateType.REDO, redo: 2 }, state: { redo: 2, total: 300 }, totalDelta: 200 },
        { payload: { type: UpdateType.PAGE, actualPage: 50 }, state: { actualPage: 50, total: 50 }, totalDelta: -50 },
    ])("dispatches $payload.type through the composed service", async ({ payload, state, totalDelta }) => {
        const persist = vi.fn<BooksRepository["updateUserMediaDetails"]>(async (_userId, _mediaId, data) => data);
        const { updateUserMediaDetails } = createBooksService({
            ...booksRepository,
            findById: async () => baseBook,
            findUserMedia: async () => makeUserState({}),
            updateUserMediaDetails: persist,
        });

        const result = await updateUserMediaDetails(1, baseBook.id, payload);

        expect(persist).toHaveBeenCalledWith(1, baseBook.id, expect.objectContaining(state));
        expect(result.newState).toMatchObject(state);
        expect(result.delta.totalSpecific).toBe(totalDelta);
        expect(result.delta.timeSpent).toBeCloseTo(totalDelta * TIME_PER_PAGE);
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

        it("should calculate delta when status updates", () => {
            const old = makeUserState({ status: Status.PLAN_TO_READ, total: 0 });
            const newer = makeState({ status: Status.COMPLETED, total: 100 });
            const delta = booksService.calculateDeltaStats(old, newer, baseBook);

            expect(delta.timeSpent).toBe(100 * TIME_PER_PAGE);
            expect(delta.statusCounts?.[Status.COMPLETED]).toBe(1);
            expect(delta.statusCounts?.[Status.PLAN_TO_READ]).toBe(-1);
        });

        it("should handle redo increment correctly", () => {
            const newer = makeState({ status: Status.COMPLETED, redo: 2, total: 300 });
            const old = makeUserState({ status: Status.COMPLETED, redo: 1, total: 200 });
            const delta = booksService.calculateDeltaStats(old, newer, baseBook);

            expect(delta.totalRedo).toBe(1);
            expect(delta.totalSpecific).toBe(100);
            expect(delta.timeSpent).toBe(100 * TIME_PER_PAGE);
        });

        it("should handle redo decrement correctly", () => {
            const old = makeUserState({ redo: 3, total: 400 });
            const newer = makeState({ redo: 2, total: 300 });
            const delta = booksService.calculateDeltaStats(old, newer, baseBook);

            expect(delta.totalRedo).toBe(-1);
            expect(delta.totalSpecific).toBe(-100);
            expect(delta.timeSpent).toBe(-(100 * TIME_PER_PAGE));
        });

    });

    describe("updateHandlers", () => {
        it("updateStatusHandler: PTR -> COMPLETED add total and actualPage", () => {
            const current = makeState({ status: Status.PLAN_TO_READ, total: 0, actualPage: 0 });
            const [next, log] = booksService.updateStatusHandler(current, { status: Status.COMPLETED }, baseBook);

            expect(next.total).toBe(100);
            expect(next.actualPage).toBe(100);
            expect(next.status).toBe(Status.COMPLETED);
            expect(log?.oldValue).toBe(Status.PLAN_TO_READ);
            expect(log?.newValue).toBe(Status.COMPLETED);
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

        it("updateStatusHandler: PLAN_TO_READ -> READING", () => {
            const current = makeState({ status: Status.PLAN_TO_READ, total: 0, actualPage: 0 });
            const [next, log] = booksService.updateStatusHandler(current, { status: Status.READING }, baseBook);

            expect(next.total).toBe(0);
            expect(next.actualPage).toBe(0);
            expect(next.status).toBe(Status.READING);
            expect(log?.oldValue).toBe(Status.PLAN_TO_READ);
            expect(log?.newValue).toBe(Status.READING);
        });

        it("updateRedoHandler should update redo and total", () => {
            const current = makeState({ redo: 1, total: 200 });
            const [next, log] = booksService.updateRedoHandler(current, { redo: 2 }, baseBook);

            expect(next.redo).toBe(2);
            expect(next.total).toBe(300);
            expect(log?.oldValue).toBe(1);
            expect(log?.newValue).toBe(2);
        });

        it("updatePageHandler should update actualPage and total", () => {
            const current = makeState({ actualPage: 50, total: 50, redo: 0 });
            const [next, log] = booksService.updatePageHandler(current, { actualPage: 80 }, baseBook);

            expect(next.actualPage).toBe(80);
            expect(next.total).toBe(80);
            expect(log?.oldValue).toBe(50);
            expect(log?.newValue).toBe(80);
        });

        it("updatePageHandler with redo should update actualPage and total", () => {
            const current = makeState({ actualPage: 50, total: 150, redo: 1 });
            const [next, log] = booksService.updatePageHandler(current, { actualPage: 80 }, baseBook);

            expect(next.actualPage).toBe(80);
            expect(next.total).toBe(180);
            expect(log?.oldValue).toBe(50);
            expect(log?.newValue).toBe(80);
        });
    });
});
