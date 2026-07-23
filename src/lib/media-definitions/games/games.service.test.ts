import {describe, expect, it} from "vitest";
import {RatingSystemType, Status} from "@/lib/utils/enums";
import {UserMediaWithTags} from "@/lib/types/user-media.types";
import {GamesService} from "@/lib/server/domain/media/games/games.service";
import {Game, GamesList} from "@/lib/server/domain/media/games/games.types";
import {GamesRepository} from "@/lib/server/domain/media/games/games.repository";
import {createListTableStub, createRepoStub} from "@/lib/server/domain/media/service-test-utils";


describe("GamesService", () => {
    const gamesRepository = createRepoStub({ listTable: createListTableStub() }) as unknown as GamesRepository;
    const gamesService = new GamesService(gamesRepository);

    const baseGame: Game = {
        id: 1,
        name: "Test Game",
        imageCover: "test.jpg",
        releaseDate: "2025-01-01",
        synopsis: "A test game.",
        apiId: 123,
        lockStatus: true,
        addedAt: new Date().toISOString(),
        lastApiUpdate: new Date().toISOString(),
        voteAverage: 8,
        voteCount: 100,
        steamApiId: null,
        collectionId: null,
        igdbUrl: "test-game.com",
        gameEngine: "Unity",
        gameModes: "multiplayer",
        playerPerspective: "First Person",
        hltbMainTime: 20,
        hltbMainAndExtraTime: 50,
        hltbTotalCompleteTime: 80,
    };

    const makeState = (overrides: Partial<GamesList>): GamesList => ({
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
        playtime: 0,
        platform: "PC",
        ...overrides,
    });

    const makeUserState = (overrides: Partial<UserMediaWithTags<GamesList>>): UserMediaWithTags<GamesList> => ({
        ...makeState(overrides),
        tags: [],
        ratingSystem: RatingSystemType.SCORE,
    });

    describe("calculateDeltaStats", () => {
        it("should calculate delta when adding new game", () => {
            const delta = gamesService.calculateDeltaStats(null, makeState({ playtime: 120 }), baseGame);

            expect(delta.timeSpent).toBe(120);
            expect(delta.totalEntries).toBe(1);
            expect(delta.entriesRated).toBe(0);
            expect(delta.entriesFavorites).toBe(0);
            expect(delta.statusCounts?.[Status.COMPLETED]).toBe(1);
        });

        it("should calculate delta when removing game", () => {
            const old = makeUserState({ favorite: true, rating: 8, comment: "Great", playtime: 120 });
            const delta = gamesService.calculateDeltaStats(old, null, baseGame);

            expect(delta.timeSpent).toBe(-120);
            expect(delta.totalEntries).toBe(-1);
            expect(delta.entriesRated).toBe(-1);
            expect(delta.sumEntriesRated).toBe(-8);
            expect(delta.entriesFavorites).toBe(-1);
            expect(delta.entriesCommented).toBe(-1);
            expect(delta.statusCounts?.[Status.COMPLETED]).toBe(-1);
        });

        it("should calculate delta when status updates: PTP¨-> COMPLETED", () => {
            const old = makeUserState({ status: Status.PLAN_TO_PLAY, playtime: 0 });
            const newer = makeState({ status: Status.COMPLETED, playtime: 120 });
            const delta = gamesService.calculateDeltaStats(old, newer, baseGame);

            expect(delta.timeSpent).toBe(120);
            expect(delta.statusCounts?.[Status.PLAN_TO_PLAY]).toBe(-1);
            expect(delta.statusCounts?.[Status.COMPLETED]).toBe(1);
        });

        it("should return no delta when states are identical", () => {
            const state = makeUserState({ rating: 8, favorite: true, comment: "Nice", playtime: 120 });
            const delta = gamesService.calculateDeltaStats(state, { ...state }, baseGame);

            expect(Object.values(delta).every((v) => v === 0 || v === undefined)).toBe(true);
        });

        it("should handle playtime change correctly", () => {
            const old = makeUserState({ status: Status.COMPLETED, playtime: 100 });
            const newer = makeState({ status: Status.COMPLETED, playtime: 150 });
            const delta = gamesService.calculateDeltaStats(old, newer, baseGame);

            expect(delta.timeSpent).toBe(50);
        });

        it.each([
            { oldRating: 5, newRating: 8, expectedSum: 3 },
            { oldRating: null, newRating: 8, expectedSum: 8 },
            { oldRating: 8, newRating: null, expectedSum: -8 },
        ])(
            "should handle rating changes (old: $oldRating → new: $newRating)", ({ oldRating, newRating, expectedSum }) => {
                const old = makeUserState({ rating: oldRating });
                const newer = makeState({ rating: newRating });
                const delta = gamesService.calculateDeltaStats(old, newer, baseGame);

                expect(delta.sumEntriesRated).toBe(expectedSum);
            });

        it.each([
            { oldComment: null, newComment: "Nice", expected: 1 },
            { oldComment: "Old", newComment: null, expected: -1 },
        ])(
            "should handle comment changes (old: $oldComment → new: $newComment)", ({ oldComment, newComment, expected }) => {
                const old = makeUserState({ comment: oldComment });
                const newer = makeState({ comment: newComment });
                const delta = gamesService.calculateDeltaStats(old, newer, baseGame);

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
                const delta = gamesService.calculateDeltaStats(old, newer, baseGame);

                expect(delta.entriesFavorites).toBe(expected);
            });
    });

    describe("updateHandlers", () => {
        it("updateStatusHandler: PLAYING -> PTP should reset playtime", () => {
            const current = makeState({ status: Status.PLAYING, playtime: 50 });
            const [next, log] = gamesService.updateStatusHandler(current, { status: Status.PLAN_TO_PLAY }, baseGame);

            expect(next.playtime).toBe(0);
            expect(next.status).toBe(Status.PLAN_TO_PLAY);
            expect(log?.oldValue).toBe(Status.PLAYING);
            expect(log?.newValue).toBe(Status.PLAN_TO_PLAY);
        });

        it("updateStatusHandler: PTP -> COMPLETED should not change playtime", () => {
            const current = makeState({ status: Status.PLAN_TO_PLAY, playtime: 0 });
            const [next, log] = gamesService.updateStatusHandler(current, { status: Status.COMPLETED }, baseGame);

            expect(next.playtime).toBe(0);
            expect(next.status).toBe(Status.COMPLETED);
            expect(log?.oldValue).toBe(Status.PLAN_TO_PLAY);
            expect(log?.newValue).toBe(Status.COMPLETED);
        });

        it("updatePlaytimeHandler should update playtime", () => {
            const current = makeState({ playtime: 50 });
            const [next, log] = gamesService.updatePlaytimeHandler(current, { playtime: 100 }, baseGame);

            expect(next.playtime).toBe(100);
            expect(log?.oldValue).toBe(50);
            expect(log?.newValue).toBe(100);
        });
    });
});
