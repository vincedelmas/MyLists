import {describe, expect, it, vi} from "vitest";
import {UserMediaWithTags} from "@/lib/types/user-media.types";
import {createTvService} from "@/lib/server/domain/media/tv/tv.service";
import {TvList, TvType} from "@/lib/server/domain/media/tv/tv.types";
import {RatingSystemType, Status} from "@/lib/utils/enums";
import {TvRepository} from "@/lib/server/domain/media/tv/tv.repository";
import {createListTableStub, createRepoStub} from "@/lib/server/domain/media/service-test-utils";
import {seriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";

vi.mock("@/lib/server/database/async-storage", () => ({
    withTransaction: <T>(action: () => T) => action(),
}));


const epsPerSeasonMock = [
    { season: 1, episodes: 12 },
    { season: 2, episodes: 12 },
    { season: 3, episodes: 24 },
];
const totalEpisodesMock = epsPerSeasonMock.reduce((acc, s) => acc + s.episodes, 0);


describe("TvService", () => {
    describe("shared TV behavior", () => {
        const states = epsPerSeasonMock.map(s => ({ ...s, redo: 0, rating: null as number | null }));
        const tvRepository = createRepoStub(
            { listTable: createListTableStub() },
            {
                getMediaEpsPerSeason: () => epsPerSeasonMock,
                getUserSeasons: () => states,
            },
        ) as unknown as TvRepository;
        const tvService = createTvService(tvRepository, seriesServerDefinition);

        const baseTv: TvType = {
            id: 1,
            name: "Test TV Show",
            imageCover: "test.jpg",
            releaseDate: "2025-01-01",
            synopsis: "A test show.",
            duration: 24,
            totalSeasons: 3,
            totalEpisodes: totalEpisodesMock,
            apiId: 123,
            originalName: "Test TV Show Original",
            lastAirDate: "2026-01-01",
            homepage: "test.com",
            createdBy: "Test Creator",
            originCountry: "US",
            prodStatus: "Ended",
            voteAverage: 8,
            voteCount: 100,
            popularity: 10,
            seasonToAir: null,
            lockStatus: false,
            episodeToAir: null,
            nextEpisodeToAir: null,
            addedAt: new Date().toISOString(),
            lastApiUpdate: new Date().toISOString(),
        };

        const makeState = (overrides: Partial<TvList>): TvList => ({
            id: 1,
            userId: 1,
            mediaId: 1,
            status: Status.COMPLETED,
            rating: null,
            comment: null,
            favorite: false,
            addedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            currentSeason: 3,
            currentEpisode: 24,
            redo: 0,
            customCover: null,
            total: totalEpisodesMock,
            ...overrides,
        });

        const makeUserState = (overrides: Partial<UserMediaWithTags<TvList>>): UserMediaWithTags<TvList> => ({
            ...makeState(overrides),
            tags: [],
            ratingSystem: RatingSystemType.SCORE,
        });

        describe("calculateDeltaStats", () => {
            it("should calculate delta when adding new completed show", () => {
                const delta = tvService.calculateDeltaStats(null, makeState({}), baseTv);

                expect(delta.totalEntries).toBe(1);
                expect(delta.totalSpecific).toBe(totalEpisodesMock);
                expect(delta.statusCounts?.[Status.COMPLETED]).toBe(1);
                expect(delta.timeSpent).toBe(totalEpisodesMock * baseTv.duration);
            });

            it("should calculate delta when removing a show", () => {
                const old = makeUserState({});
                const delta = tvService.calculateDeltaStats(old, null, baseTv);

                expect(delta.totalEntries).toBe(-1);
                expect(delta.totalSpecific).toBe(-totalEpisodesMock);
                expect(delta.statusCounts?.[Status.COMPLETED]).toBe(-1);
                expect(delta.timeSpent).toBe(-totalEpisodesMock * baseTv.duration);
            });

        });

        describe("updateHandlers", () => {
            it.each([
                { currentSeason: 2, currentEpisode: 12, status: Status.WATCHING },
                { currentSeason: 3, currentEpisode: 7, status: Status.WATCHING },
                { currentSeason: 3, currentEpisode: 24, status: Status.COMPLETED },
            ])("completes only the final listed season and episode: $currentSeason/$currentEpisode", ({ currentSeason, currentEpisode, status }) => {
                const current = makeState({ status: Status.WATCHING, currentSeason: 1, currentEpisode: 4, total: 4 });
                const [next, log] = tvService.updateEpsSeasonsHandler(current, { currentSeason, currentEpisode }, { ...baseTv, prodStatus: "Returning Series" });

                expect(next).toMatchObject({ currentSeason, currentEpisode, status });
                expect(log).toEqual({ oldValue: [1, 4], newValue: [currentSeason, currentEpisode] });
                expect(next.total).toBe(epsPerSeasonMock.filter(s => s.season < currentSeason)
                    .reduce((sum, s) => sum + s.episodes, 0) + currentEpisode);
            });

            it("updateRedoHandler: should update total when a season is rewatched", async () => {
                const current = makeState({ status: Status.COMPLETED, total: totalEpisodesMock, redo: 0 });
                const [next, log] = await tvService.updateRedoHandler(current, { seasonRedos: [{ season: 1, redo: 1 }] });

                expect(next.redo).toBe(1);
                expect(next.total).toBe(totalEpisodesMock + epsPerSeasonMock[0].episodes);
                expect(log?.newValue).toBe(1);
            });

            it("updateRedoHandler: rejects unknown seasons", () => {
                expect(() => tvService.updateRedoHandler(makeState({}), { seasonRedos: [{ season: 99, redo: 1 }] })).toThrow("Invalid season");
            });

        });
    });
});
