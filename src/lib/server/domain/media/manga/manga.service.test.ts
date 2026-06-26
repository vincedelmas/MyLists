import {describe, expect, it} from "vitest";
import type {Manga, MangaList} from "./manga.types";
import {RatingSystemType, Status} from "@/lib/utils/enums";
import type {UserMediaWithTags} from "@/lib/types/user-media.types";
import {MangaService} from "@/lib/server/domain/media/manga/manga.service";
import type {MangaRepository} from "@/lib/server/domain/media/manga/manga.repository";
import {createListTableStub, createRepoStub} from "@/lib/server/domain/media/service-test-utils";


describe("MangaService", () => {
    const mangaRepository = createRepoStub({ listTable: createListTableStub() }) as unknown as MangaRepository;
    const mangaService = new MangaService(mangaRepository);
    const TIME_PER_CHAPTER = 7;

    const baseManga: Manga = {
        id: 1,
        name: "Test Manga",
        imageCover: "test.jpg",
        releaseDate: "2025-01-01",
        synopsis: "A test manga.",
        originalName: "Test Manga Original",
        chapters: 100,
        prodStatus: "Finished",
        siteUrl: "test-manga.com",
        endDate: "2026-01-01",
        volumes: 10,
        voteAverage: 8,
        voteCount: 100,
        popularity: 10,
        publishers: "Test Publisher",
        apiId: 123,
        lockStatus: true,
        addedAt: new Date().toISOString(),
        lastApiUpdate: new Date().toISOString(),
    };

    const makeState = (overrides: Partial<MangaList>): MangaList => ({
        id: 1,
        userId: 1,
        mediaId: 1,
        status: Status.COMPLETED,
        rating: null,
        comment: null,
        favorite: false,
        customCover: null,
        addedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        currentChapter: 100,
        redo: 0,
        total: 100,
        ...overrides,
    });

    const makeUserState = (overrides: Partial<UserMediaWithTags<MangaList>>): UserMediaWithTags<MangaList> => ({
        ...makeState(overrides),
        tags: [],
        ratingSystem: RatingSystemType.SCORE,
    });

    describe("calculateDeltaStats", () => {
        it("should calculate delta when adding new manga", () => {
            const delta = mangaService.calculateDeltaStats(null, makeState({ currentChapter: 100, total: 100 }), baseManga);

            expect(delta.timeSpent).toBe(100 * TIME_PER_CHAPTER);
            expect(delta.totalEntries).toBe(1);
            expect(delta.totalSpecific).toBe(100);
            expect(delta.entriesRated).toBe(0);
            expect(delta.entriesFavorites).toBe(0);
            expect(delta.statusCounts?.[Status.COMPLETED]).toBe(1);
        });

        it("should calculate delta when removing manga", () => {
            const old = makeUserState({ favorite: true, rating: 8, comment: "Great", currentChapter: 100, total: 100 });
            const delta = mangaService.calculateDeltaStats(old, null, baseManga);

            expect(delta.timeSpent).toBe(-100 * TIME_PER_CHAPTER);
            expect(delta.totalEntries).toBe(-1);
            expect(delta.totalSpecific).toBe(-100);
            expect(delta.entriesRated).toBe(-1);
            expect(delta.sumEntriesRated).toBe(-8);
            expect(delta.entriesFavorites).toBe(-1);
            expect(delta.entriesCommented).toBe(-1);
            expect(delta.statusCounts?.[Status.COMPLETED]).toBe(-1);
        });

        it("should calculate delta when status updates: PLAN_TO_READ -> COMPLETED", () => {
            const old = makeUserState({ status: Status.PLAN_TO_READ, total: 0, currentChapter: 0 });
            const newer = makeState({ status: Status.COMPLETED, currentChapter: 100, total: 100 });
            const delta = mangaService.calculateDeltaStats(old, newer, baseManga);

            expect(delta.timeSpent).toBe(100 * TIME_PER_CHAPTER);
            expect(delta.totalSpecific).toBe(100);
            expect(delta.statusCounts?.[Status.PLAN_TO_READ]).toBe(-1);
            expect(delta.statusCounts?.[Status.COMPLETED]).toBe(1);
        });

        it("should return no delta when states are identical", () => {
            const state = makeUserState({ rating: 8, favorite: true, comment: "Nice", currentChapter: 100, total: 100 });
            const delta = mangaService.calculateDeltaStats(state, { ...state }, baseManga);

            expect(Object.values(delta).every((v) => v === 0 || v === undefined)).toBe(true);
        });

        it("should handle redo increment correctly", () => {
            const old = makeUserState({ status: Status.COMPLETED, redo: 1, total: 200, currentChapter: 100 });
            const newer = makeState({ status: Status.COMPLETED, redo: 2, total: 300, currentChapter: 100 });
            const delta = mangaService.calculateDeltaStats(old, newer, baseManga);

            expect(delta.totalRedo).toBe(1);
            expect(delta.totalSpecific).toBe(100);
            expect(delta.timeSpent).toBe(100 * TIME_PER_CHAPTER);
        });

        it("should handle redo decrement correctly", () => {
            const old = makeUserState({ redo: 3, total: 400, currentChapter: 100 });
            const newer = makeState({ redo: 2, total: 300, currentChapter: 100 });
            const delta = mangaService.calculateDeltaStats(old, newer, baseManga);

            expect(delta.totalRedo).toBe(-1);
            expect(delta.totalSpecific).toBe(-100);
            expect(delta.timeSpent).toBe(-100 * TIME_PER_CHAPTER);
        });

        it("should handle chapter change correctly", () => {
            const old = makeUserState({ status: Status.READING, currentChapter: 50, total: 50 });
            const newer = makeState({ status: Status.READING, currentChapter: 75, total: 75 });
            const delta = mangaService.calculateDeltaStats(old, newer, baseManga);

            expect(delta.timeSpent).toBe(25 * TIME_PER_CHAPTER);
            expect(delta.totalSpecific).toBe(25);
        });

        it.each([
            { oldRating: 5, newRating: 8, expectedSum: 3 },
            { oldRating: null, newRating: 8, expectedSum: 8 },
            { oldRating: 8, newRating: null, expectedSum: -8 },
        ])(
            "should handle rating changes (old: $oldRating → new: $newRating)", ({ oldRating, newRating, expectedSum }) => {
                const old = makeUserState({ rating: oldRating });
                const newer = makeState({ rating: newRating });
                const delta = mangaService.calculateDeltaStats(old, newer, baseManga);

                expect(delta.sumEntriesRated).toBe(expectedSum);
            });

        it.each([
            { oldComment: null, newComment: "Nice", expected: 1 },
            { oldComment: "Old", newComment: null, expected: -1 },
        ])(
            "should handle comment changes (old: $oldComment → new: $newComment)", ({ oldComment, newComment, expected }) => {
                const old = makeUserState({ comment: oldComment });
                const newer = makeState({ comment: newComment });
                const delta = mangaService.calculateDeltaStats(old, newer, baseManga);

                expect(delta.entriesCommented).toBe(expected);
            }
        );

        it.each([
            { oldFav: false, newFav: true, expected: 1 },
            { oldFav: true, newFav: false, expected: -1 },
        ])(
            "should handle favorite changes (old: $oldFav → new: $newFav)", ({ oldFav, newFav, expected }) => {
                const old = makeUserState({ favorite: oldFav });
                const newer = makeState({ favorite: newFav });
                const delta = mangaService.calculateDeltaStats(old, newer, baseManga);

                expect(delta.entriesFavorites).toBe(expected);
            });
    });

    describe("updateHandlers", () => {
        it("updateStatusHandler: READING -> PTR should reset currentChapter", () => {
            const current = makeState({ status: Status.READING, currentChapter: 50, total: 50 });
            const [next, log] = mangaService.updateStatusHandler(current, { status: Status.PLAN_TO_READ }, baseManga);

            expect(next.total).toBe(0);
            expect(next.currentChapter).toBe(0);
            expect(next.status).toBe(Status.PLAN_TO_READ);
            expect(log?.oldValue).toBe(Status.READING);
            expect(log?.newValue).toBe(Status.PLAN_TO_READ);
        });

        it("updateStatusHandler: PTR -> COMPLETED, update currentChapter and total", () => {
            const current = makeState({ status: Status.PLAN_TO_READ, currentChapter: 0, total: 0 });
            const [next, log] = mangaService.updateStatusHandler(current, { status: Status.COMPLETED }, baseManga);

            expect(next.currentChapter).toBe(100);
            expect(next.total).toBe(100);
            expect(next.status).toBe(Status.COMPLETED);
            expect(log?.oldValue).toBe(Status.PLAN_TO_READ);
            expect(log?.newValue).toBe(Status.COMPLETED);
        });

        it("updateStatusHandler: COMPLETED -> PTR set total, redo and currentChapter = 0", () => {
            const current = makeState({ status: Status.COMPLETED, redo: 4, total: 500, currentChapter: 100 });
            const [next, log] = mangaService.updateStatusHandler(current, { status: Status.PLAN_TO_READ }, baseManga);

            expect(next.redo).toBe(0);
            expect(next.total).toBe(0);
            expect(next.currentChapter).toBe(0);
            expect(next.status).toBe(Status.PLAN_TO_READ);
            expect(log?.oldValue).toBe(Status.COMPLETED);
            expect(log?.newValue).toBe(Status.PLAN_TO_READ);
        });

        it("updateRedoHandler should update redo and total", () => {
            const current = makeState({ status: Status.COMPLETED, redo: 1, total: 200, currentChapter: 100 });
            const [next, log] = mangaService.updateRedoHandler(current, { redo: 2 }, baseManga);

            expect(next.redo).toBe(2);
            expect(next.total).toBe(300);
            expect(next.currentChapter).toBe(100);
            expect(log?.oldValue).toBe(1);
            expect(log?.newValue).toBe(2);
        });

        it("updateChapterHandler should update currentChapter and total", () => {
            const current = makeState({ status: Status.READING, currentChapter: 50, total: 50 });
            const [next, log] = mangaService.updateChapterHandler(current, { currentChapter: 100 }, baseManga);

            expect(next.currentChapter).toBe(100);
            expect(next.total).toBe(100);
            expect(log?.oldValue).toBe(50);
            expect(log?.newValue).toBe(100);
        });
    });
});
