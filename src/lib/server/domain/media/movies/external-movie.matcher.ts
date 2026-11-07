import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import type {ImportItemsSelect} from "@/lib/types/imports.types";
import type {TmdbMoviesProvider} from "@/lib/server/api-providers/tmdb-movies.provider";
import type {MediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";
import type {ExternalMediaMatcher} from "@/lib/server/domain/imports/matchers/media-matcher.interfaces";
import {filterImportCandidates, matchExternalItems} from "@/lib/server/domain/imports/matchers/external-matcher";


export class ExternalTMDBMovieMatcher implements ExternalMediaMatcher {
    constructor(
        private moviesProvider: Pick<TmdbMoviesProvider, "search" | "findMovieIdsByImdbId">,
        private moviesIngestion: MediaIngestionService,
        private resultBatchSize = 50,
    ) {
    }

    match(items: ImportItemsSelect[]) {
        return matchExternalItems({
            items,
            mediaLabel: "Movie",
            resultBatchSize: this.resultBatchSize,
            resolveItem: async item => {
                if (item.externalApiSource === ApiProviderType.TMDB && item.externalApiId) {
                    return { mediaId: await this.moviesIngestion.storeFromExternal(item.externalApiId, false) };
                }

                const imdbId: string | undefined = item.payload.imdbId;
                if (!imdbId && !item.name) return { statusReason: "Movie API match not found" };

                const candidateIds = imdbId
                    ? await this.moviesProvider.findMovieIdsByImdbId(imdbId)
                    : filterImportCandidates((await this.moviesProvider.search(item.name!)).data, MediaType.MOVIES, item.releaseDate, item.name!)
                        .map(candidate => candidate.id);

                if (candidateIds.length === 0) {
                    return { statusReason: imdbId ? `No TMDB movie found for IMDb ID ${imdbId}` : "Movie API match not found" };
                }
                if (candidateIds.length > 1) {
                    return { statusReason: imdbId ? `Multiple TMDB movies found for IMDb ID ${imdbId}` : "Movie API match is ambiguous" };
                }

                return { mediaId: await this.moviesIngestion.storeFromExternal(candidateIds[0], !!imdbId) };
            },
        });
    }
}
