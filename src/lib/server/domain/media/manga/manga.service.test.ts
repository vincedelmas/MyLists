import {describe, expect, it, vi} from "vitest";
import type {Manga, MangaList} from "./manga.types";
import {RatingSystemType, Status} from "@/lib/utils/enums";
import type {UserMediaWithTags} from "@/lib/types/user-media.types";
import {createMangaService} from "@/lib/server/domain/media/manga/manga.service";
import type {MangaRepository} from "@/lib/server/domain/media/manga/manga.repository";
import {createListTableStub, createRepoStub} from "@/lib/server/domain/media/service-test-utils";

vi.mock("@/lib/server/database/async-storage", () => ({
    withTransaction: <T>(action: () => T) => action(),
}));


describe("MangaService", () => {
    const mangaRepository = createRepoStub({ listTable: createListTableStub() }) as unknown as MangaRepository;
    const mangaService = createMangaService(mangaRepository);
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

    });

    describe("updateHandlers", () => {
        it.each([null, 0, 100])("completes the final chapter only when the total is known: %s", (chapters) => {
            const current = makeState({ status: Status.READING, currentChapter: 99, total: 99 });
            const [next, log] = mangaService.updateChapterHandler(current, { currentChapter: 100 }, { ...baseManga, chapters });
            expect(next.status).toBe(chapters ? Status.COMPLETED : Status.READING);
            expect(log).toEqual({ oldValue: 99, newValue: 100 });
        });

        it("updateStatusHandler: preserves entered chapters when a publishing manga has no chapter total", () => {
            const current = makeState({ status: Status.READING, currentChapter: 1, total: 1 });
            const media = { ...baseManga, chapters: null, prodStatus: "Publishing" };
            const [next] = mangaService.updateStatusHandler(current, { status: Status.COMPLETED }, media);

            expect(next.currentChapter).toBe(1);
            expect(next.total).toBe(1);
            expect(next.status).toBe(Status.COMPLETED);
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

        it.each([{ redo: 0, total: 50 }, { redo: 2, total: 250 }])(
            "preserves partial progress when changing rereads to $redo", ({ redo, total }) => {
                const current = makeState({ status: Status.READING, currentChapter: 50, redo: 1, total: 150 });
                const [reread, log] = mangaService.updateRedoHandler(current, { redo }, baseManga);

                expect(reread).toMatchObject({ status: Status.READING, currentChapter: 50, redo, total });
                expect(log).toEqual({ oldValue: 1, newValue: redo });

                const [nextChapter] = mangaService.updateChapterHandler(reread, { currentChapter: 51 }, baseManga);
                expect(nextChapter.total).toBe(total + 1);

                const delta = mangaService.calculateDeltaStats(makeUserState(reread), nextChapter, baseManga);
                expect(delta.totalSpecific).toBe(1);
                expect(delta.timeSpent).toBeCloseTo(TIME_PER_CHAPTER);
            },
        );


    });
});
