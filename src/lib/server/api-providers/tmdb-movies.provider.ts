import {MediaType} from "@/lib/utils/enums";
import {TmdbApi} from "@/lib/server/api-providers/api";
import {ExternalMediaProvider, MediaIngestionRepository, RefreshCandidateSource} from "@/lib/server/api-providers/interfaces.types";
import {UpsertMovieWithDetails} from "@/lib/server/domain/catalog/catalog-ingestion.types";
import {tmdbTransformer} from "@/lib/server/api-providers/transformers/tmdb.transformer";
import {createMediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";


export const createTmdbMoviesProvider = (tmdb: TmdbApi): ExternalMediaProvider<UpsertMovieWithDetails> => {
    return ({
        source: "tmdb",
        mediaType: MediaType.MOVIES,

        search: {
            async search(query, page = 1) {
                const raw = await tmdb.search(query, page);
                return tmdbTransformer.transformSearchResults(raw);
            },
        },
        details: {
            async getDetails(apiId) {
                const raw = await tmdb.getMovieDetails(Number(apiId));
                return tmdbTransformer.transformMoviesDetailsResults(raw);
            },
        },
        trends: {
            async getTrends() {
                const raw = await tmdb.getMoviesTrending();
                return tmdbTransformer.transformMoviesTrends(raw);
            },
        },
    });
}


export const createMoviesIngestionService = (
    repository: MediaIngestionRepository<UpsertMovieWithDetails>,
    provider: ExternalMediaProvider<UpsertMovieWithDetails>,
    refreshCandidates?: RefreshCandidateSource,
) => {
    return createMediaIngestionService({
        provider,
        repository,
        refreshCandidates,
    });
}
