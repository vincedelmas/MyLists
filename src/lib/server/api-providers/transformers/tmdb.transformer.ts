import {MediaType} from "@/lib/utils/enums";
import {getImageUrl} from "@/lib/utils/image-url";
import {isLatin1} from "@/lib/utils/text-formatting";
import {CoverType} from "@/lib/types/media-common.types";
import {saveImageFromUrl} from "@/lib/utils/image-saver";
import {
    JikanAnimeSearchResponse,
    ProviderSearchResult,
    SearchData,
    TmdbMovieDetails,
    TmdbMovieSearchResult,
    TmdbMultiSearchResponse,
    TmdbTrendingMoviesResponse,
    TmdbTrendingTvResponse,
    TmdbTvDetails,
    TmdbTvSearchResult,
    TrendsMedia
} from "@/lib/types/provider.types";
import {formatDateForDb} from "@/lib/utils/date-formatting";


type Options = {
    dirSaveName: CoverType;
    defaultDuration: number;
}


const maxActors = 5;
const maxNetworks = 2;
const animeDefaultDuration = 24;
const seriesDefaultDuration = 40;
const moviesDefaultDuration = 90;
const maxGenres = 5;
const imageBaseUrl = "https://image.tmdb.org/t/p/w300";


const transformTvDetailsResults = async (rawData: TmdbTvDetails, options: Options) => {
    const { defaultDuration, dirSaveName } = options;

    const processCreatedBy = (rawData: TmdbTvDetails) => {
        const creators = rawData?.created_by;
        if (creators?.length) {
            return creators.map((creator) => creator.name).join(", ");
        }

        const writers = rawData?.credits?.crew?.filter((m) => m.department === "Writing" && m.known_for_department === "Writing");
        if (!writers?.length) return;

        const uniqueWriterNames = Array.from(new Set(writers.map((writer) => writer.name)));
        const topWriters = uniqueWriterNames
            .sort((nameA, nameB) => {
                const popularityA = writers.find((w) => w.name === nameA)?.popularity || 0;
                const popularityB = writers.find((w) => w.name === nameB)?.popularity || 0;
                return popularityB - popularityA;
            }).slice(0, 2);

        return topWriters.join(", ");
    };

    const snapshot = {
        apiId: rawData.id,
        name: rawData?.name,
        synopsis: rawData?.overview,
        homepage: rawData?.homepage,
        productionStatus: rawData?.status,
        voteCount: rawData?.vote_count ?? 0,
        popularity: rawData?.popularity ?? 0,
        createdBy: processCreatedBy(rawData),
        originalName: rawData?.original_name,
        voteAverage: rawData?.vote_average ?? 0,
        originCountry: rawData?.origin_country?.[0],
        totalSeasons: rawData?.number_of_seasons ?? 1,
        totalEpisodes: rawData?.number_of_episodes ?? 1,
        lastAirDate: formatDateForDb(rawData.last_air_date),
        releaseDate: formatDateForDb(rawData.first_air_date),
        durationMinutes: rawData?.episode_run_time?.[0] ?? defaultDuration,
        nextEpisodeSeason: rawData?.next_episode_to_air?.season_number ?? null,
        nextEpisodeNumber: rawData?.next_episode_to_air?.episode_number ?? null,
        nextEpisodeAirDate: formatDateForDb(rawData?.next_episode_to_air?.air_date),
        imageCover: await saveImageFromUrl({
            dirSaveName: dirSaveName,
            imageUrl: `${imageBaseUrl}${rawData?.poster_path}`,
        }),
    };

    const seasons = rawData?.seasons?.filter((s) => s.season_number && s.season_number > 0)
        .map((s) => ({ seasonNumber: s.season_number, episodeCount: s.episode_count }))
        .filter((s) => s.episodeCount > 0) || [];

    if (seasons.length === 0) {
        seasons.push({ seasonNumber: 1, episodeCount: 1 });
    }

    return {
        ...snapshot,
        seasons,
        networks: rawData?.networks?.slice(0, maxNetworks).map((network) => network.name),
        actors: rawData?.credits?.cast?.slice(0, maxActors).map((actor) => actor.name),
        genres: rawData?.genres?.slice(0, maxGenres).map((genre) => genre.name),
    };
};


const transformSearchResults = (searchData: SearchData<TmdbMultiSearchResponse>) => {
    const results = searchData?.rawData?.results ?? [];
    const hasNextPage = searchData?.rawData?.total_pages > searchData.page;

    const fResults = results.filter((i) => {
        return i.media_type !== "person" && (i.media_type === "tv" || i.media_type === "movie");
    });

    const processSearchTv = (item: TmdbTvSearchResult) => {
        const date = item.first_air_date;
        const name = isLatin1(item.original_name) ? item.original_name : item.name;

        let itemType: MediaType = MediaType.SERIES;

        const isJapanese = item.original_language === "ja" ||
            (Array.isArray(item.origin_country) ? item.origin_country.includes("JP") : item.origin_country === "JP");
        const isAnimationGenre = item.genre_ids?.includes(16) ?? false;

        if (isJapanese && isAnimationGenre) {
            itemType = MediaType.ANIME;
        }

        return { name, date, itemType };
    };

    const processSearchMovie = (item: TmdbMovieSearchResult) => {
        const date = item.release_date;
        const itemType = MediaType.MOVIES;
        const name = isLatin1(item.original_title) ? item.original_title : item.title;

        return { name, date, itemType };
    };

    const transformedResults = fResults.map((item) => {
        const baseInfo = {
            id: item.id,
            image: item.poster_path ? `${imageBaseUrl}${item.poster_path}` : getImageUrl("movies-covers"),
        };

        let details;
        if (item.media_type === "tv") {
            details = processSearchTv(item);
        }
        else {
            details = processSearchMovie(item);
        }

        return { ...baseInfo, ...details } as ProviderSearchResult;
    });

    return { hasNextPage, data: transformedResults };
};


const transformMoviesDetailsResults = async (rawData: TmdbMovieDetails) => {
    return {
        apiId: rawData.id,
        name: rawData?.title,
        tagline: rawData?.tagline,
        synopsis: rawData?.overview,
        homepage: rawData?.homepage,
        budget: rawData?.budget ?? 0,
        revenue: rawData?.revenue ?? 0,
        voteCount: rawData?.vote_count ?? 0,
        popularity: rawData?.popularity ?? 0,
        originalName: rawData?.original_title,
        voteAverage: rawData?.vote_average ?? 0,
        originalLanguage: rawData?.original_language,
        collectionExternalId: rawData?.belongs_to_collection?.id,
        releaseDate: formatDateForDb(rawData.release_date),
        durationMinutes: rawData?.runtime ?? moviesDefaultDuration,
        directorName: rawData?.credits?.crew?.find((crew) => crew.job === "Director")?.name,
        compositorName: rawData?.credits?.crew?.find((crew) => crew.job === "Original Music Composer")?.name,
        imageCover: await saveImageFromUrl({
            dirSaveName: "movies-covers",
            imageUrl: `${imageBaseUrl}${rawData?.poster_path}`,
        }),
        genres: rawData?.genres?.slice(0, maxGenres).map((genre) => genre.name),
        actors: rawData?.credits?.cast?.slice(0, maxActors).map((cast) => cast.name),
    };
};


const transformAnimeDetailsResults = async (rawData: TmdbTvDetails) => {
    return transformTvDetailsResults(rawData, {
        dirSaveName: "anime-covers",
        defaultDuration: animeDefaultDuration,
    });
};


const transformSeriesDetailsResults = async (rawData: TmdbTvDetails) => {
    return transformTvDetailsResults(rawData, {
        dirSaveName: "series-covers",
        defaultDuration: seriesDefaultDuration,
    });
};


const transformMoviesTrends = async (rawData: TmdbTrendingMoviesResponse) => {
    const moviesTrends: TrendsMedia[] = [];

    const rawResults = rawData?.results ?? [];
    for (const result of rawResults) {
        const mediaData: TrendsMedia = {
            apiId: result.id,
            overview: result?.overview,
            displayName: result?.title,
            mediaType: MediaType.MOVIES,
            releaseDate: result?.release_date,
            posterPath: result?.poster_path ? `${imageBaseUrl}${result.poster_path}` : getImageUrl("movies-covers"),
        }

        moviesTrends.push(mediaData);
    }

    return moviesTrends.slice(0, 15);
};


const transformTvTrends = async (rawData: TmdbTrendingTvResponse) => {
    const tvTrends: TrendsMedia[] = [];

    const rawResults = rawData?.results ?? [];
    for (const result of rawResults) {
        const mediaData: TrendsMedia = {
            apiId: result.id,
            displayName: result?.name,
            overview: result?.overview,
            mediaType: MediaType.SERIES,
            releaseDate: result?.first_air_date,
            posterPath: result?.poster_path ? `${imageBaseUrl}${result.poster_path}` : getImageUrl("series-covers"),
        }

        const isJap = result?.origin_country.find((c) => c.toLowerCase() === "jp" || c.toLowerCase() === "ja") ?? false;
        const isAnimation = result?.genre_ids.find((g) => g === 16) ?? false;
        if (isJap && isAnimation) {
            mediaData.mediaType = MediaType.ANIME;
        }

        tvTrends.push(mediaData);
    }

    return tvTrends.slice(0, 15);
};


const addAnimeSpecificGenres = (jikanData: JikanAnimeSearchResponse, existingGenres: string[] | null | undefined) => {
    const { genres = [], demographics = [] } = jikanData?.data?.[0] || {};
    const genreList = genres.map((genre) => genre.name);
    const demoList = demographics.map((demographic) => demographic.name);

    const newGenres = demoList.length >= 5
        ? demoList.slice(0, 5) : [...genreList.slice(0, 5 - demoList.length), ...demoList];

    return newGenres.length ? newGenres : existingGenres;
};


export const tmdbTransformer = {
    transformTvTrends,
    transformMoviesTrends,
    transformSearchResults,
    addAnimeSpecificGenres,
    transformAnimeDetailsResults,
    transformMoviesDetailsResults,
    transformSeriesDetailsResults,
}
