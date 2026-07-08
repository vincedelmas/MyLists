import {describe, expect, it} from "vitest";
import type {Movie, MoviesList} from "./movies.types";
import {convertToCsv} from "@/lib/utils/file-download";
import type {UserMediaWithTags} from "@/lib/types/user-media.types";
import {MoviesService} from "@/lib/server/domain/media/movies/movies.service";
import {parseMyListsCsv} from "@/lib/server/domain/imports/parsers/mylists.parser";
import {ApiProviderType, MediaType, RatingSystemType, Status} from "@/lib/utils/enums";
import type {MoviesRepository} from "@/lib/server/domain/media/movies/movies.repository";
import {createListTableStub, createRepoStub} from "@/lib/server/domain/media/service-test-utils";


describe("MoviesService", () => {
    const moviesRepository = createRepoStub({ listTable: createListTableStub() }) as unknown as MoviesRepository;
    const moviesService = new MoviesService(moviesRepository);

    const baseMovie: Movie = {
        id: 1,
        name: "Test Movie",
        imageCover: "test.jpg",
        releaseDate: "2025-01-01",
        synopsis: "A test movie.",
        originalName: "Test Movie Original",
        homepage: "testhomepage.com",
        duration: 120,
        originalLanguage: "en",
        voteAverage: 8,
        voteCount: 100,
        popularity: 10,
        budget: 1_000_000,
        revenue: 2_000_000,
        apiId: 123,
        collectionId: 456,
        tagline: "A test tagline",
        directorName: "Test Director",
        compositorName: "Test Compositor",
        lockStatus: true,
        addedAt: new Date().toISOString(),
        lastApiUpdate: new Date().toISOString(),
    };

    const makeState = (overrides: Partial<MoviesList>): MoviesList => ({
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
        redo: 0,
        total: 1,
        ...overrides,
    });

    const makeUserState = (overrides: Partial<UserMediaWithTags<MoviesList>>): UserMediaWithTags<MoviesList> => ({
        ...makeState(overrides),
        tags: [],
        ratingSystem: RatingSystemType.SCORE,
    });

    describe("downloadMediaListAsCSV", () => {
        it("exports rows using the MyLists import-compatible shape", async () => {
            const repository = createRepoStub({
                mediaType: MediaType.MOVIES,
                listTable: createListTableStub(),
            }, {
                downloadMediaListAsCSV: async () => [{
                    id: 1,
                    redo: 1,
                    total: 2,
                    externalApiId: "550",
                    rating: 9,
                    userId: 42,
                    mediaId: 100,
                    comment: "Nice",
                    favorite: true,
                    customCover: null,
                    status: Status.COMPLETED,
                    mediaName: "Fight Club",
                    releaseDate: "1999-10-15",
                    addedAt: "2024-01-01 00:00:00",
                    lastUpdated: "2024-01-02 00:00:00",
                }],
            }) as unknown as MoviesRepository;
            const service = new MoviesService(repository);

            const rows = await service.downloadMediaListAsCSV(42);
            const parsed = parseMyListsCsv(convertToCsv(rows!));

            expect(rows).toEqual([expect.objectContaining({
                redo: 1,
                total: 2,
                mediaName: "Fight Club",
                rating: 9,
                comment: "Nice",
                favorite: true,
                status: Status.COMPLETED,
                mediaType: MediaType.MOVIES,
                releaseDate: "1999-10-15",
                externalApiId: "550",
                externalApiSource: ApiProviderType.TMDB,
                formatVersion: "1",
            })]);
            expect(parsed).toMatchObject({
                failedCount: 0,
                items: [{
                    name: "Fight Club",
                    releaseDate: "1999-10-15",
                    externalApiId: "550",
                    mediaType: MediaType.MOVIES,
                    externalApiSource: ApiProviderType.TMDB,
                    payload: {
                        redo: 1,
                        total: 2,
                        rating: 9,
                        comment: "Nice",
                        favorite: true,
                        status: Status.COMPLETED,
                        addedAt: "2024-01-01 00:00:00",
                        lastUpdated: "2024-01-02 00:00:00",
                    },
                }],
            });
        });
    });

    describe("calculateDeltaStats", () => {
        it("should calculate delta when adding new movie", () => {
            const delta = moviesService.calculateDeltaStats(null, makeState({}), baseMovie);

            expect(delta.timeSpent).toBe(120);
            expect(delta.totalEntries).toBe(1);
            expect(delta.entriesRated).toBe(0);
            expect(delta.entriesFavorites).toBe(0);
            expect(delta.statusCounts?.[Status.COMPLETED]).toBe(1);
        });

        it("should calculate delta when removing movie", () => {
            const old = makeUserState({ favorite: true, rating: 8, comment: "Great" });
            const delta = moviesService.calculateDeltaStats(old, null, baseMovie);

            expect(delta.timeSpent).toBe(-120);
            expect(delta.totalEntries).toBe(-1);
            expect(delta.entriesFavorites).toBe(-1);
            expect(delta.statusCounts?.[Status.COMPLETED]).toBe(-1);
        });

        it("should calculate delta when status updates", () => {
            const old = makeUserState({ status: Status.PLAN_TO_WATCH, total: 0 });
            const newer = makeState({ status: Status.COMPLETED });
            const delta = moviesService.calculateDeltaStats(old, newer, baseMovie);

            expect(delta.timeSpent).toBe(120);
            expect(delta.statusCounts?.[Status.PLAN_TO_WATCH]).toBe(-1);
            expect(delta.statusCounts?.[Status.COMPLETED]).toBe(1);
        });

        it("should return no delta when states are identical", () => {
            const state = makeUserState({ rating: 8, favorite: true, comment: "Nice" });
            const delta = moviesService.calculateDeltaStats(state, { ...state }, baseMovie);

            expect(Object.values(delta).every((v) => v === 0 || v === undefined)).toBe(true);
        });

        it("should handle redo increment correctly", () => {
            const old = makeUserState({ status: Status.COMPLETED, redo: 1, total: 2 });
            const newer = makeState({ status: Status.COMPLETED, redo: 2, total: 3 });
            const delta = moviesService.calculateDeltaStats(old, newer, baseMovie);

            expect(delta.totalRedo).toBe(1);
            expect(delta.totalSpecific).toBe(1);
            expect(delta.timeSpent).toBe(120);
        });

        it("should handle redo decrement correctly", () => {
            const old = makeUserState({ redo: 3, total: 4 });
            const newer = makeState({ redo: 2, total: 3 });
            const delta = moviesService.calculateDeltaStats(old, newer, baseMovie);

            expect(delta.totalRedo).toBe(-1);
            expect(delta.totalSpecific).toBe(-1);
            expect(delta.timeSpent).toBe(-120);
        });

        it.each([
            { oldRating: 5, newRating: 8, expectedSum: 3 },
            { oldRating: null, newRating: 8, expectedSum: 8 },
            { oldRating: 8, newRating: null, expectedSum: -8 },
        ])(
            "should handle rating changes (old: $oldRating → new: $newRating)", ({ oldRating, newRating, expectedSum }) => {
                const old = makeUserState({ rating: oldRating });
                const newer = makeState({ rating: newRating });
                const delta = moviesService.calculateDeltaStats(old, newer, baseMovie);

                expect(delta.sumEntriesRated).toBe(expectedSum);
            });

        it.each([
            { oldComment: null, newComment: "Nice", expected: 1 },
            { oldComment: "Old", newComment: null, expected: -1 },
        ])(
            "should handle comment changes (old: $oldComment → new: $newComment)", ({ oldComment, newComment, expected }) => {
                const old = makeUserState({ comment: oldComment });
                const newer = makeState({ comment: newComment });
                const delta = moviesService.calculateDeltaStats(old, newer, baseMovie);

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
                const delta = moviesService.calculateDeltaStats(old, newer, baseMovie);

                expect(delta.entriesFavorites).toBe(expected);
            });
    });

    describe("updateHandlers", () => {
        it("updateStatusHandler: PTW -> COMPLETED add total +1", () => {
            const current = makeState({ status: Status.PLAN_TO_WATCH, total: 0 });
            const [next, log] = moviesService.updateStatusHandler(current, { status: Status.COMPLETED }, baseMovie);

            expect(next.total).toBe(1);
            expect(next.status).toBe(Status.COMPLETED);
            expect(log?.oldValue).toBe(Status.PLAN_TO_WATCH);
            expect(log?.newValue).toBe(Status.COMPLETED);
        });

        it("updateStatusHandler: COMPLETED -> PTW set total and redo = 0", () => {
            const current = makeState({ status: Status.COMPLETED, redo: 4, total: 5 });
            const [next, log] = moviesService.updateStatusHandler(current, { status: Status.PLAN_TO_WATCH }, baseMovie);

            expect(next.redo).toBe(0);
            expect(next.total).toBe(0);
            expect(next.status).toBe(Status.PLAN_TO_WATCH);
            expect(log?.oldValue).toBe(Status.COMPLETED);
            expect(log?.newValue).toBe(Status.PLAN_TO_WATCH);
        });

        it("updateRedoHandler should update redo and total", () => {
            const current = makeState({ redo: 1, total: 2 });
            const [next, log] = moviesService.updateRedoHandler(current, { redo: 2 }, baseMovie);

            expect(next.redo).toBe(2);
            expect(next.total).toBe(3);
            expect(log?.oldValue).toBe(1);
            expect(log?.newValue).toBe(2);
        });
    });
});
