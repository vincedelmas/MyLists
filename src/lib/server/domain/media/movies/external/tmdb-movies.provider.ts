import {MediaType} from "@/lib/utils/enums";
import {TmdbApi} from "@/lib/server/api-providers/api";
import {ExternalMediaProvider, RefreshCandidateSource} from "@/lib/server/api-providers/interfaces.types";
import {CatalogIngestionCommands} from "@/lib/server/domain/media/shared/catalog/catalog-ingestion.types";
import {MovieCatalogSnapshot} from "@/lib/server/domain/media/movies/catalog/movie-catalog-snapshot";
import {tmdbMovieTransformer} from "@/lib/server/domain/media/movies/external/tmdb-movie.transformer";
import {transformTmdbSearchResults} from "@/lib/server/domain/media/shared/external/tmdb-search.transformer";
import {createMediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";


export const createTmdbMoviesProvider = (tmdb: TmdbApi): ExternalMediaProvider<MovieCatalogSnapshot> => {
    return ({
        source: "tmdb",
        mediaType: MediaType.MOVIES,

        search: {
            async search(query, page = 1) {
                const raw = await tmdb.search(query, page);
                return transformTmdbSearchResults(raw);
            },
        },
        details: {
            async getDetails(apiId) {
                const raw = await tmdb.getMovieDetails(Number(apiId));
                return tmdbMovieTransformer.transformDetails(raw);
            },
        },
        trends: {
            async getTrends() {
                const raw = await tmdb.getMoviesTrending();
                return tmdbMovieTransformer.transformTrends(raw);
            },
        },
    });
}


export const createMoviesIngestionService = (
    catalog: CatalogIngestionCommands<MovieCatalogSnapshot>,
    provider: ExternalMediaProvider<MovieCatalogSnapshot>,
    refreshCandidates?: RefreshCandidateSource,
) => {
    return createMediaIngestionService({
        provider,
        catalog,
        refreshCandidates,
    });
}
