import {ApiProviderType, MediaType, Status} from "@/lib/utils/enums";
import type {MoviesService} from "@/lib/server/domain/media/movies/movies.service";
import type {TmdbMoviesProvider} from "@/lib/server/api-providers/tmdb-movies.provider";
import type {MediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";
import {internalApiIdMatcher} from "@/lib/server/domain/imports/matchers/internal-api-id.matcher";
import {internalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-name-date.matcher";
import {createImportListWriter, createMediaMatcher} from "@/lib/server/domain/imports/matchers/media.matcher";
import {filterImportCandidates, matchExternalItems} from "@/lib/server/domain/imports/matchers/external-matcher";
import {moviesFinalListInsertSchema, moviesImportPayloadSchema} from "@/lib/server/domain/media/movies/movies.types";


export const createMoviesMatcher = (
    moviesService: MoviesService,
    moviesProvider: Pick<TmdbMoviesProvider, "search" | "findMovieIdsByImdbId">,
    moviesIngestion: MediaIngestionService,
) => createMediaMatcher({
    internalMatchers: [
        internalApiIdMatcher(ApiProviderType.TMDB, moviesService),
        internalNameDateMatcher(moviesService, ApiProviderType.TMDB),
    ],
    externalMatchers: [{
        match: (items) => matchExternalItems({
            items,
            mediaLabel: "Movie",
            resultBatchSize: 50,
            resolveItem: async item => {
                if (item.externalApiSource === ApiProviderType.TMDB && item.externalApiId) {
                    return { mediaId: await moviesIngestion.storeFromExternal(item.externalApiId, false) };
                }

                const imdbId: string | undefined = item.payload.imdbId;
                if (!imdbId && !item.name) return { statusReason: "Movie API match not found" };

                const candidateIds = imdbId
                    ? await moviesProvider.findMovieIdsByImdbId(imdbId)
                    : filterImportCandidates((await moviesProvider.search(item.name!)).data, MediaType.MOVIES, item.releaseDate, item.name!)
                        .map(candidate => candidate.id);

                if (candidateIds.length === 0) {
                    return { statusReason: imdbId ? `No TMDB movie found for IMDb ID ${imdbId}` : "Movie API match not found" };
                }
                if (candidateIds.length > 1) {
                    return { statusReason: imdbId ? `Multiple TMDB movies found for IMDb ID ${imdbId}` : "Movie API match is ambiguous" };
                }

                return { mediaId: await moviesIngestion.storeFromExternal(candidateIds[0], !!imdbId) };
            },
        }),
    }],
    listWriter: createImportListWriter({
        insertRows: moviesService.bulkInsertUserMedia,
        toRow: (userId, { item, mediaId }) => {
            const payload = moviesImportPayloadSchema.parse(item.payload);

            const redo = payload.redo ?? 0;
            const total = payload.total ?? (payload.status === Status.COMPLETED ? 1 + redo : 0);

            return moviesFinalListInsertSchema.parse({ userId, mediaId, ...payload, redo, total });
        },
    }),
});
