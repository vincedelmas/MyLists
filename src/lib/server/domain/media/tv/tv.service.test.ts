import {describe, expect, it} from "vitest";
import {UserMediaWithTags} from "@/lib/types/user-media.types";
import {TvService} from "@/lib/server/domain/media/tv/tv.service";
import {TvList, TvType} from "@/lib/server/domain/media/tv/tv.types";
import {MediaType, RatingSystemType, Status} from "@/lib/utils/enums";
import {TvRepository} from "@/lib/server/domain/media/tv/tv.repository";
import {createListTableStub, createRepoStub} from "@/lib/server/domain/media/service-test-utils";
import {animeDefinition} from "@/lib/server/domain/media/tv/anime/anime.definition";
import {seriesDefinition} from "@/lib/server/domain/media/tv/series/series.definition";


const epsPerSeasonMock = [
    { season: 1, episodes: 12 },
    { season: 2, episodes: 12 },
    { season: 3, episodes: 24 },
];
const totalEpisodesMock = epsPerSeasonMock.reduce((acc, s) => acc + s.episodes, 0);


describe("TvService", () => {
    [MediaType.ANIME, MediaType.SERIES].forEach((mediaType) => {
        describe(`for ${mediaType}`, () => {
            const tvRepository = createRepoStub(
                { listTable: createListTableStub() },
                { getMediaEpsPerSeason: async () => epsPerSeasonMock },
            ) as unknown as TvRepository;
            const definition = mediaType === MediaType.ANIME ? animeDefinition : seriesDefinition;
            const tvService = new TvService(tvRepository, definition);

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
                redo: 0, // Legacy
                redo2: [0, 0, 0],
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

                it("should calculate delta for episode progress", () => {
                    const old = makeUserState({ status: Status.WATCHING, currentSeason: 1, currentEpisode: 5, total: 5, redo2: [0, 0, 0] });
                    const newer = makeState({ status: Status.WATCHING, currentSeason: 1, currentEpisode: 10, total: 10, redo2: [0, 0, 0] });
                    const delta = tvService.calculateDeltaStats(old, newer, baseTv);

                    expect(delta.totalSpecific).toBe(5);
                    expect(delta.timeSpent).toBe(5 * baseTv.duration);
                });

                it("should calculate delta for season progress", () => {
                    const old = makeUserState({ status: Status.WATCHING, currentSeason: 1, currentEpisode: 12, total: 12, redo2: [0, 0, 0] });
                    const newer = makeState({ status: Status.WATCHING, currentSeason: 2, currentEpisode: 1, total: 13, redo2: [0, 0, 0] });
                    const delta = tvService.calculateDeltaStats(old, newer, baseTv);

                    expect(delta.totalSpecific).toBe(1);
                    expect(delta.timeSpent).toBe(baseTv.duration);
                });

                it("should calculate delta for redoing a season", () => {
                    const old = makeUserState({ status: Status.COMPLETED, total: totalEpisodesMock, redo2: [0, 0, 0] });
                    const newer = makeState({ status: Status.COMPLETED, total: totalEpisodesMock + epsPerSeasonMock[0].episodes, redo2: [1, 0, 0] });
                    const delta = tvService.calculateDeltaStats(old, newer, baseTv);

                    expect(delta.totalRedo).toBe(1);
                    expect(delta.totalSpecific).toBe(epsPerSeasonMock[0].episodes);
                    expect(delta.timeSpent).toBe(epsPerSeasonMock[0].episodes * baseTv.duration);
                });
            });

            describe("updateHandlers", () => {
                it("updateStatusHandler: PTW -> COMPLETED", async () => {
                    const current = makeState({ status: Status.PLAN_TO_WATCH, currentSeason: 1, currentEpisode: 0, total: 0, redo2: [0, 0, 0] });
                    const [next, log] = await tvService.updateStatusHandler(current, { status: Status.COMPLETED }, baseTv);

                    expect(next.total).toBe(totalEpisodesMock);
                    expect(next.status).toBe(Status.COMPLETED);
                    expect(next.currentSeason).toBe(epsPerSeasonMock.length);
                    expect(next.currentEpisode).toBe(epsPerSeasonMock[epsPerSeasonMock.length - 1].episodes);
                    expect(log?.newValue).toBe(Status.COMPLETED);
                });

                it("updateStatusHandler: COMPLETED -> PTW", async () => {
                    const current = makeState({ status: Status.COMPLETED, total: totalEpisodesMock, redo2: [1, 1, 1] });
                    const [next, log] = await tvService.updateStatusHandler(current, { status: Status.PLAN_TO_WATCH }, baseTv);

                    expect(next.total).toBe(0);
                    expect(next.redo2).toEqual([0, 0, 0]);
                    expect(next.currentSeason).toBe(1);
                    expect(next.currentEpisode).toBe(0);
                    expect(next.status).toBe(Status.PLAN_TO_WATCH);
                    expect(log?.newValue).toBe(Status.PLAN_TO_WATCH);
                });

                it("updateRedoHandler: should update total when a season is rewatched", async () => {
                    const current = makeState({ status: Status.COMPLETED, total: totalEpisodesMock, redo2: [0, 0, 0] });
                    const [next, log] = await tvService.updateRedoHandler(current, { redo2: [1, 0, 0] }, baseTv);

                    expect(next.redo2).toEqual([1, 0, 0]);
                    expect(next.total).toBe(totalEpisodesMock + epsPerSeasonMock[0].episodes);
                    expect(log?.newValue).toBe(1);
                });

                it("updateEpsSeasonsHandler: should update total on episode change", async () => {
                    const current = makeState({ status: Status.WATCHING, currentSeason: 1, currentEpisode: 5, total: 5, redo2: [0, 0, 0] });
                    const [next, log] = await tvService.updateEpsSeasonsHandler(current, { currentEpisode: 10 }, baseTv);

                    expect(next.total).toBe(10);
                    expect(next.currentEpisode).toBe(10);
                    expect(log?.newValue).toEqual([1, 10]);
                });

                it("updateEpsSeasonsHandler: should update total on season change", async () => {
                    const current = makeState({ status: Status.WATCHING, currentSeason: 1, currentEpisode: 12, total: 12, redo2: [0, 0, 0] });
                    const [next, log] = await tvService.updateEpsSeasonsHandler(current, { currentSeason: 2 }, baseTv);

                    expect(next.total).toBe(13);
                    expect(next.currentSeason).toBe(2);
                    expect(next.currentEpisode).toBe(1);
                    expect(log?.newValue).toEqual([2, 1]);
                });
            });
        });
    });
});
