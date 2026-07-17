import {MediaType} from "@/lib/utils/enums";
import {getImageUrl} from "@/lib/utils/image-url";
import {CoverType} from "@/lib/types/media-common.types";
import {saveImageFromUrl} from "@/lib/utils/image-saver";
import {formatDateForDb} from "@/lib/utils/date-formatting";
import {JikanAnimeSearchResponse, TmdbTrendingTvResponse, TmdbTvDetails, TrendsMedia} from "@/lib/types/provider.types";


type TvTransformOptions = {
    dirSaveName: CoverType;
    defaultDuration: number;
};


const maxActors = 5;
const maxNetworks = 2;
const maxGenres = 5;
const animeDefaultDuration = 24;
const seriesDefaultDuration = 40;
const imageBaseUrl = "https://image.tmdb.org/t/p/w300";


const transformTvDetails = async (rawData: TmdbTvDetails, options: TvTransformOptions) => {
    const snapshot = {
        apiId: rawData.id,
        name: rawData?.name,
        synopsis: rawData?.overview,
        homepage: rawData?.homepage,
        productionStatus: rawData?.status,
        voteCount: rawData?.vote_count ?? 0,
        popularity: rawData?.popularity ?? 0,
        createdBy: createdBy(rawData),
        originalName: rawData?.original_name,
        voteAverage: rawData?.vote_average ?? 0,
        originCountry: rawData?.origin_country?.[0],
        totalSeasons: rawData?.number_of_seasons ?? 1,
        totalEpisodes: rawData?.number_of_episodes ?? 1,
        lastAirDate: formatDateForDb(rawData.last_air_date),
        releaseDate: formatDateForDb(rawData.first_air_date),
        durationMinutes: rawData?.episode_run_time?.[0] ?? options.defaultDuration,
        nextEpisodeSeason: rawData?.next_episode_to_air?.season_number ?? null,
        nextEpisodeNumber: rawData?.next_episode_to_air?.episode_number ?? null,
        nextEpisodeAirDate: formatDateForDb(rawData?.next_episode_to_air?.air_date),
        imageCover: await saveImageFromUrl({
            dirSaveName: options.dirSaveName,
            imageUrl: `${imageBaseUrl}${rawData?.poster_path}`,
        }),
    };

    const seasons = rawData?.seasons?.filter((season) => season.season_number && season.season_number > 0)
        .map((season) => ({ seasonNumber: season.season_number, episodeCount: season.episode_count }))
        .filter((season) => season.episodeCount > 0) ?? [];
    if (seasons.length === 0) seasons.push({ seasonNumber: 1, episodeCount: 1 });

    return {
        ...snapshot,
        seasons,
        networks: rawData?.networks?.slice(0, maxNetworks).map((network) => network.name),
        actors: rawData?.credits?.cast?.slice(0, maxActors).map((actor) => actor.name),
        genres: rawData?.genres?.slice(0, maxGenres).map((genre) => genre.name),
    };
};


const transformAnimeDetails = (rawData: TmdbTvDetails) => transformTvDetails(rawData, {
    dirSaveName: "anime-covers",
    defaultDuration: animeDefaultDuration,
});


const transformSeriesDetails = (rawData: TmdbTvDetails) => transformTvDetails(rawData, {
    dirSaveName: "series-covers",
    defaultDuration: seriesDefaultDuration,
});


const transformTrends = async (rawData: TmdbTrendingTvResponse) => {
    const trends: TrendsMedia[] = (rawData?.results ?? []).map((result) => {
        const japanese = result?.origin_country.some((country) => ["jp", "ja"].includes(country.toLowerCase()));
        const animation = result?.genre_ids.includes(16);

        return {
            apiId: result.id,
            displayName: result?.name,
            overview: result?.overview,
            mediaType: japanese && animation ? MediaType.ANIME : MediaType.SERIES,
            releaseDate: result?.first_air_date,
            posterPath: result?.poster_path ? `${imageBaseUrl}${result.poster_path}` : getImageUrl("series-covers"),
        };
    });
    return trends.slice(0, 15);
};


const addAnimeSpecificGenres = (jikanData: JikanAnimeSearchResponse, existingGenres: string[] | null | undefined) => {
    const { genres = [], demographics = [] } = jikanData?.data?.[0] || {};
    const genreList = genres.map((genre) => genre.name);
    const demoList = demographics.map((demographic) => demographic.name);
    const newGenres = demoList.length >= 5
        ? demoList.slice(0, 5)
        : [...genreList.slice(0, 5 - demoList.length), ...demoList];

    return newGenres.length ? newGenres : existingGenres;
};


const createdBy = (rawData: TmdbTvDetails) => {
    const creators = rawData?.created_by;
    if (creators?.length) return creators.map((creator) => creator.name).join(", ");

    const writers = rawData?.credits?.crew?.filter((member) => (
        member.department === "Writing" && member.known_for_department === "Writing"
    ));
    if (!writers?.length) return;

    return [...new Set(writers.map((writer) => writer.name))]
        .sort((left, right) => {
            const leftPopularity = writers.find((writer) => writer.name === left)?.popularity || 0;
            const rightPopularity = writers.find((writer) => writer.name === right)?.popularity || 0;
            return rightPopularity - leftPopularity;
        })
        .slice(0, 2)
        .join(", ");
};


export const tmdbTvTransformer = {
    transformTrends,
    transformAnimeDetails,
    transformSeriesDetails,
    addAnimeSpecificGenres,
};
