import {MediaType} from "@/lib/utils/enums";
import {getImageUrl} from "@/lib/utils/image-url";
import {saveImageFromUrl} from "@/lib/utils/image-saver";
import {formatDateForDb} from "@/lib/utils/date-formatting";
import {TmdbMovieDetails, TmdbTrendingMoviesResponse, TrendsMedia} from "@/lib/types/provider.types";


const maxActors = 5;
const maxGenres = 5;
const defaultDuration = 90;
const imageBaseUrl = "https://image.tmdb.org/t/p/w300";


const transformDetails = async (rawData: TmdbMovieDetails) => ({
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
    durationMinutes: rawData?.runtime ?? defaultDuration,
    directorName: rawData?.credits?.crew?.find((crew) => crew.job === "Director")?.name,
    compositorName: rawData?.credits?.crew?.find((crew) => crew.job === "Original Music Composer")?.name,
    imageCover: await saveImageFromUrl({
        dirSaveName: "movies-covers",
        imageUrl: `${imageBaseUrl}${rawData?.poster_path}`,
    }),
    genres: rawData?.genres?.slice(0, maxGenres).map((genre) => genre.name),
    actors: rawData?.credits?.cast?.slice(0, maxActors).map((cast) => cast.name),
});


const transformTrends = async (rawData: TmdbTrendingMoviesResponse) => {
    const trends: TrendsMedia[] = (rawData?.results ?? []).map((result) => ({
        apiId: result.id,
        overview: result?.overview,
        displayName: result?.title,
        mediaType: MediaType.MOVIES,
        releaseDate: result?.release_date,
        posterPath: result?.poster_path ? `${imageBaseUrl}${result.poster_path}` : getImageUrl("movies-covers"),
    }));
    return trends.slice(0, 15);
};


export const tmdbMovieTransformer = {
    transformDetails,
    transformTrends,
};
