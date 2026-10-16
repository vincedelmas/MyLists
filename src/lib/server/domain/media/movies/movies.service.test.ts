import {describe, expect, it, vi} from "vitest";
import type {Movie, MoviesList} from "./movies.types";

import type {UserMediaWithTags} from "@/lib/types/user-media.types";
import {createMoviesService} from "@/lib/server/domain/media/movies/movies.service";

import {RatingSystemType, Status} from "@/lib/utils/enums";
import type {MoviesRepository} from "@/lib/server/domain/media/movies/movies.repository";
import {createListTableStub, createRepoStub} from "@/lib/server/domain/media/service-test-utils";

vi.mock("@/lib/server/database/async-storage", () => ({
    withTransaction: <T>(action: () => T) => action(),
}));


describe("MoviesService", () => {
    const moviesRepository = createRepoStub({ listTable: createListTableStub() }) as unknown as MoviesRepository;
    const moviesService = createMoviesService(moviesRepository);

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

        it("should handle redo decrement correctly", () => {
            const old = makeUserState({ redo: 3, total: 4 });
            const newer = makeState({ redo: 2, total: 3 });
            const delta = moviesService.calculateDeltaStats(old, newer, baseMovie);

            expect(delta.totalRedo).toBe(-1);
            expect(delta.totalSpecific).toBe(-1);
            expect(delta.timeSpent).toBe(-120);
        });

    });

    describe("updateHandlers", () => {


        it("updateStatusHandler: COMPLETED -> PTW set total and redo = 0", () => {
            const current = makeState({ status: Status.COMPLETED, redo: 4, total: 5 });
            const [next, log] = moviesService.updateStatusHandler(current, { status: Status.PLAN_TO_WATCH }, baseMovie);

            expect(next.redo).toBe(0);
            expect(next.total).toBe(0);
            expect(next.status).toBe(Status.PLAN_TO_WATCH);
            expect(log?.oldValue).toBe(Status.COMPLETED);
            expect(log?.newValue).toBe(Status.PLAN_TO_WATCH);
        });


    });
});
