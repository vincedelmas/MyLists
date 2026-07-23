import {TmdbTvDetails} from "@/lib/types/provider.types";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {tmdbTransformer} from "@/lib/server/api-providers/transformers/tmdb.transformer";
import {seriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";


const imageMocks = vi.hoisted(() => ({
    saveImageFromUrl: vi.fn(),
}));


vi.mock("@/lib/utils/image-saver", () => imageMocks);


const createTvDetails = (): TmdbTvDetails => ({
    id: 110492,
    name: "Peacemaker",
    overview: "",
    homepage: "",
    status: "Returning Series",
    vote_count: 1,
    popularity: 1,
    created_by: [],
    original_name: "Peacemaker",
    vote_average: 1,
    origin_country: ["US"],
    number_of_seasons: 2,
    number_of_episodes: 16,
    last_air_date: "2025-08-21",
    first_air_date: "2022-01-13",
    episode_run_time: [45],
    next_episode_to_air: null,
    poster_path: null,
    seasons: [{ season_number: 1, episode_count: 8 }],
    networks: [
        { id: 3186, name: "HBO Max", origin_country: "" },
        { id: 8304, name: "HBO Max", origin_country: "" },
        { id: 213, name: "Discovery", origin_country: "US" },
    ],
    credits: {
        cast: [
            { name: "John Cena" },
            { name: "John Cena" },
            { name: "Danielle Brooks" },
        ],
        crew: [],
    },
    genres: [
        { id: 1, name: "Action" },
        { id: 2, name: "Action" },
        { id: 3, name: "Comedy" },
    ],
} as unknown as TmdbTvDetails);


const seriesTransformOptions = {
    coverDirectory: seriesServerDefinition.identity.coverDirectory,
    defaultDuration: seriesServerDefinition.ingestion.defaultDuration,
    maxGenres: seriesServerDefinition.ingestion.limits.genres,
    maxActors: seriesServerDefinition.ingestion.limits.actors,
    maxNetworks: seriesServerDefinition.ingestion.limits.networks,
    maxWriters: seriesServerDefinition.ingestion.limits.writers,
};


describe("tmdbTransformer", () => {
    beforeEach(() => {
        imageMocks.saveImageFromUrl.mockReset();
        imageMocks.saveImageFromUrl.mockResolvedValue("series-covers/default.webp");
    });

    it("deduplicates TV relation names before applying their limits", async () => {
        const result = await tmdbTransformer.transformTvDetailsResults(createTvDetails(), seriesTransformOptions);

        expect(result.networkData).toEqual([
            { name: "HBO Max" },
            { name: "Discovery" },
        ]);
        expect(result.actorsData).toEqual([
            { name: "John Cena" },
            { name: "Danielle Brooks" },
        ]);
        expect(result.genresData).toEqual([
            { name: "Action" },
            { name: "Comedy" },
        ]);
    });

    it("uses media-specific relation limits and duration fallback", async () => {
        const details = createTvDetails();
        details.episode_run_time = [];

        const result = await tmdbTransformer.transformTvDetailsResults(details, {
            ...seriesTransformOptions,
            defaultDuration: 55,
            maxGenres: 1,
            maxActors: 1,
            maxNetworks: 1,
        });

        expect(result.mediaData.duration).toBe(55);
        expect(result.genresData).toEqual([{ name: "Action" }]);
        expect(result.actorsData).toEqual([{ name: "John Cena" }]);
        expect(result.networkData).toEqual([{ name: "HBO Max" }]);
    });

    it("uses the media-specific fallback writer limit", async () => {
        const details = createTvDetails();
        details.credits.crew = [
            { name: "Second Writer", department: "Writing", known_for_department: "Writing", popularity: 10 },
            { name: "Top Writer", department: "Writing", known_for_department: "Writing", popularity: 20 },
        ] as typeof details.credits.crew;

        const result = await tmdbTransformer.transformTvDetailsResults(details, {
            ...seriesTransformOptions,
            maxWriters: 1,
        });

        expect(result.mediaData.createdBy).toBe("Top Writer");
    });
});
